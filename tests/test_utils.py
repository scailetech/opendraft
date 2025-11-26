#!/usr/bin/env python3
"""
ABOUTME: Shared test utilities for all test scripts (DRY principle)
ABOUTME: Provides reusable functions for model setup, prompt loading, and agent execution
"""

import sys
import time
import logging
from pathlib import Path
from typing import Optional, Callable, Tuple, List, TYPE_CHECKING, Any, Dict

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import google.generativeai as genai
from config import get_config
from concurrency.concurrency_config import get_concurrency_config
from utils.output_validators import ValidationResult
from utils.api_citations.orchestrator import CitationResearcher
from utils.citation_database import Citation
from utils.deep_research import DeepResearchPlanner

# Configure logging
logger = logging.getLogger(__name__)


def setup_model(model_override: Optional[str] = None) -> Any:
    """
    Initialize and return configured Gemini model.

    Args:
        model_override: Optional model name to override config default

    Returns:
        genai.GenerativeModel: Configured Gemini model instance

    Raises:
        ValueError: If API key is missing or model name is invalid
    """
    config = get_config()

    if not config.google_api_key:
        raise ValueError(
            "GOOGLE_API_KEY not found. Set it in .env file or environment variables."
        )

    genai.configure(api_key=config.google_api_key)  # type: ignore[attr-defined]

    model_name = model_override or config.model.model_name

    return genai.GenerativeModel(  # type: ignore[attr-defined]
        model_name,
        generation_config={
            'temperature': config.model.temperature,
        }
    )


def load_prompt(prompt_path: str) -> str:
    """
    Load agent prompt from markdown file.

    Args:
        prompt_path: Path to prompt file (relative to project root or absolute)

    Returns:
        str: Content of the prompt file

    Raises:
        FileNotFoundError: If prompt file doesn't exist
    """
    config = get_config()
    path = Path(prompt_path)

    # If relative path, try relative to project root
    if not path.is_absolute():
        path = config.paths.project_root / path

    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")

    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def run_agent(
    model: Any,
    name: str,
    prompt_path: str,
    user_input: str,
    save_to: Optional[Path] = None,
    verbose: bool = True,
    validators: Optional[List[Callable[[str], ValidationResult]]] = None,
    max_retries: int = 3,
    skip_validation: bool = False
) -> str:
    """
    Run an AI agent with given prompt and input, with optional validation.

    This function is the core execution layer for all agents in the thesis pipeline.
    It handles LLM interaction, output validation, retries, and file I/O.

    Args:
        model: Configured Gemini model instance
        name: Human-readable name for the agent (for logging)
        prompt_path: Path to agent prompt file
        user_input: User's request/input for the agent
        save_to: Optional path to save output
        verbose: Whether to print progress messages
        validators: Optional list of validation functions to apply to output
        max_retries: Maximum retry attempts if validation fails (default: 3)
        skip_validation: If True, skip all validation checks (for automated runs)

    Returns:
        str: Validated agent output text

    Raises:
        Exception: If agent execution fails or validation fails after all retries

    Example:
        >>> from utils.output_validators import ScoutOutputValidator
        >>> output = run_agent(
        ...     model=model,
        ...     name="Scout",
        ...     prompt_path="prompts/01_research/scout.md",
        ...     user_input="Find papers on AI",
        ...     validators=[ScoutOutputValidator.validate]
        ... )
        >>> # For automated runs (skip validation)
        >>> output = run_agent(
        ...     model=model,
        ...     name="Scout",
        ...     prompt_path="prompts/01_research/scout.md",
        ...     user_input="Find papers on AI",
        ...     skip_validation=True
        ... )
    """
    # Override validators if skip_validation is True
    if skip_validation:
        validators = None
        logger.info(f"Agent '{name}': Validation skipped (skip_validation=True)")
    if verbose:
        print(f"\n{'='*70}")
        print(f"🤖 {name}")
        print(f"{'='*70}")

    # Load agent prompt
    agent_prompt = load_prompt(prompt_path)

    # Combine agent prompt with user input
    full_prompt = f"{agent_prompt}\n\n---\n\nUser Request:\n{user_input}"

    logger.debug(f"Agent '{name}': Starting execution")
    logger.debug(f"Prompt length: {len(full_prompt)} chars")
    logger.debug(f"Validators: {len(validators) if validators else 0}")

    # Initialize output variable with explicit type
    output: str = ""

    # Retry loop with exponential backoff
    for attempt in range(max_retries):
        if verbose and attempt > 0:
            print(f"Retry attempt {attempt}/{max_retries}...", end=' ', flush=True)
        elif verbose:
            print("Generating...", end=' ', flush=True)

        start_time = time.time()

        try:
            # Generate LLM response
            response = model.generate_content(full_prompt)
            output = str(response.text)  # Explicit cast for type safety

            logger.debug(f"Agent '{name}': Generated {len(output)} chars in {time.time() - start_time:.1f}s")

            # Validate output if validators provided (and not skipped)
            if validators and not skip_validation:
                validation_passed = True
                for i, validator in enumerate(validators):
                    logger.debug(f"Agent '{name}': Running validator {i+1}/{len(validators)}")
                    result = validator(output)

                    if not result.is_valid:
                        validation_passed = False
                        logger.warning(
                            f"Agent '{name}': Validation failed on attempt {attempt+1}/{max_retries}: "
                            f"{result.error_message}"
                        )

                        if verbose:
                            print(f"⚠️ Validation failed: {result.error_message}")

                        # If not last attempt, retry with backoff
                        if attempt < max_retries - 1:
                            backoff_seconds = 2 ** attempt  # Exponential: 1s, 2s, 4s
                            logger.debug(f"Agent '{name}': Backing off for {backoff_seconds}s")
                            time.sleep(backoff_seconds)
                            break  # Break validator loop to retry LLM call
                        else:
                            # Last attempt failed - raise error
                            error_msg = (
                                f"Agent '{name}' validation failed after {max_retries} attempts: "
                                f"{result.error_message}"
                            )
                            logger.error(error_msg)
                            raise ValueError(error_msg)
                    else:
                        logger.debug(f"Agent '{name}': Validator {i+1} passed")

                # If all validators passed, break retry loop
                if validation_passed:
                    logger.info(f"Agent '{name}': All {len(validators)} validators passed")
                    break
            else:
                # No validators - success on first attempt
                logger.debug(f"Agent '{name}': No validators, accepting output")
                break

        except Exception as e:
            if verbose:
                print(f"❌ Error")

            logger.error(f"Agent '{name}': Exception on attempt {attempt+1}: {str(e)}")

            # If not last attempt and it's a transient error, retry
            if attempt < max_retries - 1 and _is_transient_error(e):
                backoff_seconds = 2 ** attempt
                logger.debug(f"Agent '{name}': Transient error, retrying after {backoff_seconds}s")
                time.sleep(backoff_seconds)
                continue
            else:
                raise Exception(f"Agent '{name}' execution failed: {str(e)}") from e

    elapsed = time.time() - start_time

    # Save output if path provided
    if save_to:
        try:
            save_to.parent.mkdir(parents=True, exist_ok=True)
            with open(save_to, 'w', encoding='utf-8') as f:
                f.write(output)

            # Verify file was created successfully
            if not save_to.exists():
                raise IOError(f"Output file not created: {save_to}")

            file_size = save_to.stat().st_size
            if file_size == 0:
                raise IOError(f"Output file is empty: {save_to}")

            logger.info(f"Agent '{name}': Saved output to {save_to} ({file_size} bytes)")

        except Exception as e:
            logger.error(f"Agent '{name}': Failed to save output to {save_to}: {str(e)}")
            raise

    if verbose:
        print(f"✅ Done ({elapsed:.1f}s, {len(output):,} chars)")
        if save_to:
            print(f"Saved to: {save_to}")

    return output


def parallel_run_agents(
    agent_configs: List[Dict[str, Any]],
    model: Any,
    verbose: bool = True
) -> Dict[str, str]:
    """
    Run multiple agents in parallel (paid tier only).

    Executes 6 Crafter agents concurrently to dramatically speed up thesis generation.
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

    Examples:
        >>> configs = [
        ...     {"name": "Intro", "prompt_path": "...", "user_input": "...", "save_to": Path("...")},
        ...     {"name": "Methods", "prompt_path": "...", "user_input": "...", "save_to": Path("...")},
        ... ]
        >>> results = parallel_run_agents(configs, model)
        >>> intro_text = results["Intro"]
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


def _is_transient_error(error: Exception) -> bool:
    """
    Check if error is transient and worth retrying.

    Args:
        error: Exception to check

    Returns:
        bool: True if error is transient (network, rate limit, etc.)
    """
    error_str = str(error).lower()
    transient_patterns = [
        'timeout',
        'rate limit',
        'quota',
        'service unavailable',
        'temporarily unavailable',
        '429',  # Too Many Requests
        '503',  # Service Unavailable
        '504',  # Gateway Timeout
    ]

    return any(pattern in error_str for pattern in transient_patterns)


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


def rate_limit_delay(seconds: Optional[float] = None) -> None:
    """
    Sleep for rate limiting with tier-adaptive delays.

    Automatically adjusts delay based on detected API tier:
    - Free tier (10 RPM): 7 seconds (safe for 1 req/6s limit)
    - Paid tier (2,000 RPM): 0.3 seconds (safe for high throughput)

    Args:
        seconds: Manual override (default: None = use tier-adaptive delay)

    Examples:
        >>> rate_limit_delay()  # Auto: 7s on free, 0.3s on paid
        >>> rate_limit_delay(5)  # Manual: always 5s
    """
    if seconds is None:
        # Use tier-adaptive delay
        config = get_concurrency_config(verbose=False)
        seconds = config.rate_limit_delay

    time.sleep(seconds)


def research_citations_via_api(
    model: Any,
    research_topics: Optional[List[str]] = None,
    output_path: Optional[Path] = None,
    target_minimum: int = 50,
    verbose: bool = True,
    # Deep Research Mode parameters
    use_deep_research: bool = False,
    topic: Optional[str] = None,
    scope: Optional[str] = None,
    seed_references: Optional[List[str]] = None,
    min_sources_deep: int = 100  # Day 1 Fix: Increased from 50 to generate ~120 queries for 50-60 final citations
) -> Dict[str, Any]:
    """
    Research citations using API-backed fallback chain with optional deep research mode.

    Two modes of operation:
    1. **Standard Mode** (use_deep_research=False):
       - Uses manually provided research_topics list
       - Executes each topic through API fallback chain
       - Best for targeted, curated research queries

    2. **Deep Research Mode** (use_deep_research=True):
       - Uses DeepResearchPlanner for autonomous research strategy
       - Creates 50+ systematic queries from topic + scope + seed references
       - Best for comprehensive literature reviews (dissertations, thesis)

    API Fallback Chain:
    Crossref → Semantic Scholar → Gemini Grounded → Gemini LLM (95%+ success rate)

    Args:
        model: Configured Gemini model instance (used for planning and LLM fallback)
        research_topics: List of research topics (required if use_deep_research=False)
        output_path: Path to save Scout-compatible markdown output (required if provided)
        target_minimum: Minimum citations required to pass quality gate (default: 50)
        verbose: Whether to print progress messages (default: True)

        use_deep_research: Enable deep research mode (default: False)
        topic: Main research topic (required if use_deep_research=True)
        scope: Optional research scope constraints (e.g., "EU focus; B2C and B2B")
        seed_references: Optional seed papers to expand from
        min_sources_deep: Minimum sources for deep research (default: 50)

    Returns:
        Dict with keys:
            - citations: List[Citation] - Valid citations found
            - count: int - Number of valid citations
            - sources: Dict[str, int] - Breakdown by source (Crossref, Semantic Scholar, etc.)
            - failed_topics: List[str] - Topics that failed to find citations
            - research_plan: Optional[Dict] - Deep research plan (if deep mode enabled)

    Raises:
        ValueError: If citation count < target_minimum (quality gate failure)
        ValueError: If invalid mode parameters (missing required args)

    Examples:
        Standard Mode:
        >>> result = research_citations_via_api(
        ...     model=model,
        ...     research_topics=["open source software", "Linux kernel"],
        ...     output_path=Path("01_scout.md"),
        ...     target_minimum=50
        ... )

        Deep Research Mode:
        >>> result = research_citations_via_api(
        ...     model=model,
        ...     use_deep_research=True,
        ...     topic="Algorithmic bias in AI-powered hiring tools",
        ...     scope="EU focus; B2C and B2B SaaS",
        ...     seed_references=["Raghavan et al. (2020). Mitigating Bias"],
        ...     output_path=Path("01_scout_deep.md"),
        ...     min_sources_deep=60
        ... )
    """
    # Validate mode parameters
    if use_deep_research:
        # Debug logging to understand validation failure
        print(f"🔍 DEBUG: use_deep_research={use_deep_research}")
        print(f"🔍 DEBUG: topic type={type(topic)}, value={repr(topic)}")
        print(f"🔍 DEBUG: bool(topic)={bool(topic)}, not topic={not topic}")
        if not topic:
            raise ValueError("Deep research mode requires 'topic' parameter")
        mode_name = "DEEP RESEARCH MODE"
    else:
        if not research_topics:
            raise ValueError("Standard mode requires 'research_topics' parameter")
        mode_name = "STANDARD MODE"

    if verbose:
        print("\n" + "=" * 80)
        print(f"🔬 API-BACKED SCOUT - {mode_name}")
        print("=" * 80)

    # ========================================================================
    # DEEP RESEARCH MODE: Autonomous research planning
    # ========================================================================
    research_plan: Optional[Dict[str, Any]] = None

    if use_deep_research:
        if verbose:
            print(f"\n🧠 Deep Research Planning Phase")
            print(f"{'='*80}")
            print(f"\n📋 Input:")
            print(f"   Topic: {topic}")
            if scope:
                print(f"   Scope: {scope}")
            if seed_references:
                print(f"   Seed References: {len(seed_references)}")
            print(f"   Target: {min_sources_deep}+ sources")
            print()

        # Initialize deep research planner
        planner = DeepResearchPlanner(
            gemini_model=model,
            min_sources=min_sources_deep,
            verbose=verbose
        )

        # Create research plan
        research_plan = planner.create_research_plan(
            topic=topic,
            scope=scope,
            seed_references=seed_references
        )

        # Validate plan quality
        if not planner.validate_plan(research_plan):
            if verbose:
                print("\n⚠️  Initial plan validation failed - attempting refinement...")

            # Attempt refinement
            research_plan = planner.refine_plan(
                plan=research_plan,
                feedback=f"Insufficient queries or coverage. Need minimum {min_sources_deep} sources. "
                        f"Generate more diverse queries covering: author searches, title searches, "
                        f"topic queries, regulatory/standards, and interdisciplinary connections."
            )

            # Validate again
            if not planner.validate_plan(research_plan):
                raise ValueError(
                    f"Deep research plan validation failed after refinement. "
                    f"Generated {len(research_plan.get('queries', []))} queries, "
                    f"estimated {planner.estimate_coverage(research_plan.get('queries', []))} sources, "
                    f"but need minimum {min_sources_deep}."
                )

        # Extract queries as research topics
        research_topics = research_plan.get('queries', [])

        if verbose:
            print(f"\n✅ Research Plan Created:")
            print(f"   Queries Generated: {len(research_topics)}")
            print(f"   Estimated Coverage: {planner.estimate_coverage(research_topics)} sources")
            print(f"\n📝 Research Strategy:")
            strategy_lines = research_plan.get('strategy', '').split('\n')
            for line in strategy_lines[:5]:  # First 5 lines
                print(f"   {line}")
            if len(strategy_lines) > 5:
                print(f"   ... (see output file for full strategy)")
            print()

    # ========================================================================
    # EXECUTION PHASE: Run queries through API fallback chain
    # ========================================================================

    if verbose:
        print(f"\n📊 Execution Configuration:")
        print(f"   Target Minimum: {target_minimum} citations")
        print(f"   Research Topics/Queries: {len(research_topics)}")
        if output_path:
            print(f"   Output: {output_path}")
        print()

    # Initialize CitationResearcher with API fallback chain
    # Day 1 Fix: Disable junk fallbacks (Gemini Grounded + LLM) to ensure academic quality
    researcher = CitationResearcher(
        gemini_model=model,
        enable_crossref=True,
        enable_semantic_scholar=True,
        enable_gemini_grounded=False,  # DISABLED: Google Search returns websites, not academic papers
        enable_smart_routing=True,     # Enable query classification for source diversity
        enable_llm_fallback=False,     # DISABLED: LLM hallucinates citations
        verbose=verbose
    )

    # Track results
    citations: List[Citation] = []
    sources_breakdown: Dict[str, int] = {
        "Crossref": 0,
        "Semantic Scholar": 0,
        "Gemini Grounded": 0,  # Track Google Search grounded sources
        "Gemini LLM": 0
    }
    failed_topics: List[str] = []

    # Batch processing configuration (tier-adaptive)
    config = get_concurrency_config(verbose=False)
    BATCH_SIZE = config.scout_batch_size  # Tier-adaptive batch size
    BATCH_DELAY = config.scout_batch_delay  # Tier-adaptive delay (free=5s, paid=1s)

    # Research each topic
    for idx, topic in enumerate(research_topics, 1):
        # Add delay every BATCH_SIZE topics to prevent burst rate limits
        if idx > 1 and (idx - 1) % BATCH_SIZE == 0:
            if verbose:
                print(f"\n⏸️  Batch complete ({idx-1} topics processed). Waiting {BATCH_DELAY}s to respect API limits...")
            time.sleep(BATCH_DELAY)

        if verbose:
            print(f"[{idx}/{len(research_topics)}] 🔎 {topic[:65]}{'...' if len(topic) > 65 else ''}")

        try:
            citation = researcher.research_citation(topic)

            if citation:
                citations.append(citation)

                # Track source (CitationResearcher stores this in citation.api_source)
                source = citation.api_source or 'Unknown'
                if source in sources_breakdown:
                    sources_breakdown[source] += 1

                if verbose:
                    authors_str = citation.authors[0] if citation.authors else "Unknown"
                    print(f"    ✅ {authors_str} et al. ({citation.year})")
            else:
                failed_topics.append(topic)
                if verbose:
                    print(f"    ❌ No citation found")

        except Exception as e:
            failed_topics.append(topic)
            if verbose:
                print(f"    ❌ Error: {str(e)}")
            logger.error(f"Citation research failed for '{topic}': {str(e)}")

    # Calculate success metrics
    citation_count = len(citations)
    success_rate = (citation_count / len(research_topics) * 100) if research_topics else 0

    if verbose:
        print("\n" + "=" * 80)
        print("📊 SCOUT RESULTS")
        print("=" * 80)
        print(f"\n✅ Valid Citations: {citation_count}")
        print(f"❌ Failed Topics: {len(failed_topics)}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        print(f"\n📚 Sources Breakdown:")
        for source, count in sources_breakdown.items():
            percentage = (count / citation_count * 100) if citation_count > 0 else 0
            print(f"   {source}: {count} ({percentage:.1f}%)")
        print()

    # TIERED QUALITY GATE (Graceful Degradation)
    # Instead of binary pass/fail, we have tiered thresholds:
    # - Excellent: ≥ target_minimum (100% of goal)
    # - Acceptable: ≥ 86% of target (47/50 = acceptable with warning)
    # - Minimal: ≥ 70% of target (35/50 = last resort, warn strongly)
    # - Below 70%: Hard fail

    excellent_threshold = target_minimum
    acceptable_threshold = int(target_minimum * 0.86)  # 43 for target=50
    minimal_threshold = int(target_minimum * 0.70)    # 35 for target=50

    if citation_count >= excellent_threshold:
        # EXCELLENT: Met target exactly
        if verbose:
            print(f"✅ QUALITY GATE PASSED (EXCELLENT): {citation_count} ≥ {target_minimum} required\n")
        logger.info(f"Quality gate: EXCELLENT - {citation_count}/{target_minimum} citations")

    elif citation_count >= acceptable_threshold:
        # ACCEPTABLE: Close to target (86%+)
        percentage = (citation_count / target_minimum) * 100
        if verbose:
            print(f"⚠️  QUALITY GATE PASSED (ACCEPTABLE): {citation_count}/{target_minimum} ({percentage:.1f}%)")
            print(f"    Academic quality is good, but {target_minimum - citation_count} more citations recommended.\n")
        logger.warning(f"Quality gate: ACCEPTABLE - {citation_count}/{target_minimum} ({percentage:.1f}%)")

    elif citation_count >= minimal_threshold:
        # MINIMAL: Below target but usable (70-86%)
        percentage = (citation_count / target_minimum) * 100
        if verbose:
            print(f"⚠️  QUALITY GATE PASSED (MINIMAL): {citation_count}/{target_minimum} ({percentage:.1f}%)")
            print(f"    ⚠️  WARNING: Citation count is below recommended standards.")
            print(f"    Consider adding {target_minimum - citation_count} more citations for better academic rigor.\n")
        logger.warning(f"Quality gate: MINIMAL - {citation_count}/{target_minimum} ({percentage:.1f}%) - below standards")

    else:
        # HARD FAIL: Below 70% threshold
        percentage = (citation_count / target_minimum) * 100
        error_msg = (
            f"\n❌ QUALITY GATE FAILED (INSUFFICIENT CITATIONS)\n\n"
            f"Only {citation_count} citations found ({percentage:.1f}%), but minimum {minimal_threshold} required ({minimal_threshold/target_minimum*100:.0f}% of target).\n"
            f"Target: {target_minimum} citations (100%)\n"
            f"Acceptable: {acceptable_threshold}+ citations (86%)\n"
            f"Minimal: {minimal_threshold}+ citations (70%)\n"
            f"Current: {citation_count} citations ({percentage:.1f}%) ❌\n\n"
            f"Academic thesis standards require at least {minimal_threshold} citations.\n\n"
            f"Failed Topics ({len(failed_topics)}):\n"
        )
        for topic in failed_topics[:10]:
            error_msg += f"  - {topic}\n"
        if len(failed_topics) > 10:
            error_msg += f"  ... and {len(failed_topics) - 10} more\n"

        logger.error(f"Quality gate FAILED: {citation_count} < {minimal_threshold} (minimal threshold)")
        raise ValueError(error_msg)

    # Format output as Scout-compatible markdown
    markdown_lines = [
        "# Scout Output - Academic Citation Discovery",
        "",
        "## Summary",
        "",
        f"**Total Valid Citations**: {citation_count}",
        f"**Success Rate**: {success_rate:.1f}%",
        f"**Failed Topics**: {len(failed_topics)}",
        "",
        "### Sources Breakdown",
        ""
    ]

    for source, count in sources_breakdown.items():
        percentage = (count / citation_count * 100) if citation_count > 0 else 0
        markdown_lines.append(f"- **{source}**: {count} ({percentage:.1f}%)")

    markdown_lines.extend([
        "",
        "---",
        "",
        "## Citations Found",
        ""
    ])

    # Add citations grouped by source
    for source in ["Crossref", "Semantic Scholar", "Gemini Grounded", "Gemini LLM"]:
        source_citations = [c for c in citations if c.api_source == source]
        if not source_citations:
            continue

        markdown_lines.append(f"### From {source} ({len(source_citations)} citations)")
        markdown_lines.append("")

        for idx, citation in enumerate(source_citations, 1):
            markdown_lines.append(f"#### {idx}. {citation.title}")
            markdown_lines.append(f"**Authors**: {', '.join(citation.authors)}")
            markdown_lines.append(f"**Year**: {citation.year}")
            markdown_lines.append(f"**DOI**: {citation.doi}")
            if citation.url:
                markdown_lines.append(f"**URL**: {citation.url}")
            markdown_lines.append("")

    if failed_topics:
        markdown_lines.extend([
            "---",
            "",
            "## Failed Topics",
            "",
            "The following topics did not return valid citations:",
            ""
        ])
        for topic in failed_topics:
            markdown_lines.append(f"- {topic}")

    # Write to file
    markdown_content = "\n".join(markdown_lines)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(markdown_content, encoding='utf-8')

    if verbose:
        print(f"💾 Saved Scout output to: {output_path}")
        print(f"   File size: {output_path.stat().st_size:,} bytes\n")

    logger.info(f"Scout completed: {citation_count} citations, {success_rate:.1f}% success rate")

    return {
        "citations": citations,
        "count": citation_count,
        "sources": sources_breakdown,
        "failed_topics": failed_topics,
        "research_plan": research_plan  # None for standard mode, Dict for deep research mode
    }


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
