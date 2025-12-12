#!/usr/bin/env python3
"""
ABOUTME: Shared test utilities for all test scripts (DRY principle)
ABOUTME: Re-exports production utilities and provides test-specific helpers

Note: Core agent utilities have been moved to utils/agent_runner.py for production use.
This module re-exports them for backwards compatibility with existing test files.
"""

import sys
import time
import logging
from pathlib import Path
from typing import Optional, Callable, Tuple, List, Any, Dict

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Re-export production utilities for backwards compatibility
from utils.agent_runner import (
    setup_model,
    run_agent,
    load_prompt,
    rate_limit_delay,
    research_citations_via_api,
    _is_transient_error,
)

from config import get_config
from concurrency.concurrency_config import get_concurrency_config
from utils.output_validators import ValidationResult

# Configure logging
logger = logging.getLogger(__name__)

# Export all for backwards compatibility
__all__ = [
    'setup_model',
    'run_agent',
    'load_prompt',
    'rate_limit_delay',
    'research_citations_via_api',
    'test_agent',
    'count_words',
    'parallel_run_agents',
]


def parallel_run_agents(
    agent_configs: List[Dict[str, Any]],
    model: Any,
    verbose: bool = True
) -> Dict[str, str]:
    """
    Run multiple agents in parallel (paid tier only).

    Executes 6 Crafter agents concurrently to dramatically speed up draft generation.
    Automatically gates execution based on API tier - only enabled on paid tier (2,000 RPM).

    Args:
        agent_configs: List of agent configuration dictionaries, each containing:
            - name: str - Agent name (e.g., "6. Crafter - Write Introduction")
            - prompt_path: str - Path to agent prompt
            - user_input: str - Input for the agent
            - save_to: Path - Path to save output
        model: Configured Gemini model instance
        verbose: Whether to print progress messages

    Returns:
        Dict[str, str]: Mapping of agent names to their outputs

    Raises:
        RuntimeError: If attempted on free tier (insufficient rate limit)
        Exception: If any agent execution fails
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    # Check tier - only allow on paid tier
    config = get_concurrency_config(verbose=False)

    if not config.crafter_parallel:
        if verbose:
            print(f"\n⚠️  Crafter parallelization disabled (tier: {config.tier.upper()})")
            print(f"   Running agents sequentially for safety...")
            print()

        # Fall back to sequential execution
        results = {}
        for agent_config in agent_configs:
            output = run_agent(
                model=model,
                name=agent_config["name"],
                prompt_path=agent_config["prompt_path"],
                user_input=agent_config["user_input"],
                save_to=agent_config.get("save_to"),
                verbose=verbose
            )
            results[agent_config["name"]] = output

            # Add rate limit delay between sequential agents
            if agent_config != agent_configs[-1]:  # Don't delay after last agent
                rate_limit_delay()

        return results

    # Paid tier - run in parallel
    if verbose:
        print(f"\n{'='*70}")
        print(f"🚀 PARALLEL EXECUTION (Paid Tier)")
        print(f"{'='*70}")
        print(f"Running {len(agent_configs)} agents concurrently...")
        print()

    results = {}
    start_time = time.time()

    # Execute agents in parallel using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=len(agent_configs)) as executor:
        # Submit all agents
        future_to_config = {
            executor.submit(
                run_agent,
                model=model,
                name=agent_config["name"],
                prompt_path=agent_config["prompt_path"],
                user_input=agent_config["user_input"],
                save_to=agent_config.get("save_to"),
                verbose=verbose
            ): agent_config
            for agent_config in agent_configs
        }

        # Collect results as they complete
        completed_count = 0
        for future in as_completed(future_to_config):
            agent_config = future_to_config[future]
            agent_name = agent_config["name"]

            try:
                output = future.result()
                results[agent_name] = output
                completed_count += 1

                if verbose:
                    print(f"  ✅ [{completed_count}/{len(agent_configs)}] {agent_name} completed")

            except Exception as e:
                if verbose:
                    print(f"  ❌ {agent_name} failed: {str(e)}")
                raise Exception(f"Parallel agent '{agent_name}' failed: {str(e)}") from e

    elapsed = time.time() - start_time

    if verbose:
        print(f"\n✅ All {len(agent_configs)} agents completed in {elapsed:.1f}s")
        print(f"   Average: {elapsed/len(agent_configs):.1f}s per agent")
        print(f"   Speedup: ~{len(agent_configs)*30/elapsed:.1f}x faster than sequential")
        print()

    return results


def test_agent(
    model: Any,
    name: str,
    prompt_path: str,
    user_input: str,
    validation_fn: Callable[[str], Tuple[bool, str]],
    output_file: Optional[Path] = None
) -> Tuple[bool, str]:
    """
    Test a single agent with validation.

    Args:
        model: Configured Gemini model
        name: Agent name
        prompt_path: Path to agent prompt
        user_input: Test input
        validation_fn: Function to validate output (returns is_valid, message)
        output_file: Optional path to save output

    Returns:
        Tuple[bool, str]: (is_valid, output_text)
    """
    print(f"\n{'='*70}")
    print(f"Testing {name}")
    print(f"{'='*70}")

    try:
        output = run_agent(
            model=model,
            name=name,
            prompt_path=prompt_path,
            user_input=user_input,
            save_to=output_file,
            verbose=False
        )

        # Validate output
        is_valid, message = validation_fn(output)

        print(f"{'✅ PASS' if is_valid else '❌ FAIL'}")
        print(f"Result: {message}")
        print(f"Output length: {len(output)} chars")
        if output_file:
            print(f"Saved to: {output_file}")

        return is_valid, output

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False, str(e)


def count_words(text: str) -> int:
    """
    Count words in text.

    Args:
        text: Input text

    Returns:
        int: Word count
    """
    return len(text.split())


if __name__ == '__main__':
    # Test configuration
    print("Testing configuration...")
    config = get_config()
    print(f"✅ Model: {config.model.model_name}")
    print(f"✅ Output dir: {config.paths.output_dir}")

    # Test model setup
    print("\nTesting model setup...")
    try:
        model = setup_model()
        print(f"✅ Model initialized: {config.model.model_name}")
    except ValueError as e:
        print(f"❌ {e}")
        sys.exit(1)

    # Test prompt loading
    print("\nTesting prompt loading...")
    try:
        prompt = load_prompt("prompts/01_research/scout.md")
        print(f"✅ Prompt loaded ({len(prompt)} chars)")
    except FileNotFoundError as e:
        print(f"❌ {e}")
        sys.exit(1)

    print("\n✅ All utilities working correctly")
