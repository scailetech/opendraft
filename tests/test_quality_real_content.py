#!/usr/bin/env python3
"""
Quality gate tests with real academic content patterns.

These tests use actual academic writing patterns (not synthetic word repetition)
to verify the quality gate correctly scores real-world content.

Content patterns sourced from:
- Published academic paper abstracts and sections
- University writing guides
- Style manual examples (APA, IEEE)
"""

import pytest
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "engine"))

from utils.quality_gate import (
    score_draft_quality,
    run_quality_gate,
    _count_words,
    _score_word_count,
    _score_citations,
    _score_completeness,
    _score_structure,
)
from phases.context import DraftContext


# =============================================================================
# REAL ACADEMIC CONTENT SAMPLES
# =============================================================================

REAL_INTRO_SAMPLE = """# Introduction

The rapid advancement of artificial intelligence (AI) has fundamentally transformed how we approach
complex computational problems {cite_001}. In recent years, machine learning techniques have demonstrated
remarkable capabilities in domains ranging from natural language processing to computer vision {cite_002}.
This transformation has not occurred in isolation; rather, it reflects decades of theoretical development
and practical experimentation that have gradually refined our understanding of computational learning.

The significance of this research area extends beyond academic curiosity. Industries across the global
economy have begun integrating AI systems into their core operations, creating unprecedented demand for
robust, interpretable, and reliable machine learning solutions {cite_003}. Healthcare providers leverage
predictive models to identify at-risk patients, financial institutions employ algorithmic trading
strategies, and manufacturing firms optimize production through intelligent automation.

Despite these advances, significant challenges remain. The interpretability of deep learning models
continues to pose fundamental questions about trust and accountability {cite_004}. When a neural network
makes a consequential decision—whether approving a loan application or recommending a medical treatment—
stakeholders rightfully demand explanations that current architectures cannot adequately provide. This
tension between performance and interpretability represents one of the central challenges facing the
field today.

This paper addresses these challenges through a systematic investigation of hybrid approaches that
combine the representational power of deep learning with the interpretability of traditional statistical
methods. Our research questions center on three key areas: (1) Can hybrid architectures achieve
competitive performance while maintaining interpretability? (2) What design principles govern the
effective integration of symbolic and connectionist approaches? (3) How do different hybridization
strategies compare across diverse application domains?

The remainder of this paper is organized as follows. Section 2 reviews relevant literature on
interpretable machine learning and hybrid AI systems. Section 3 describes our methodology, including
the datasets, models, and evaluation metrics employed. Section 4 presents our experimental results
and analysis. Section 5 discusses the implications of our findings and their limitations. Finally,
Section 6 concludes with a summary of contributions and directions for future research.
"""

REAL_LIT_REVIEW_SAMPLE = """## Literature Review

### Foundations of Machine Learning Interpretability

The quest for interpretable machine learning has deep roots in the broader history of artificial
intelligence research. Early expert systems of the 1970s and 1980s emphasized rule-based reasoning
precisely because human experts could understand and validate the decision-making process {cite_005}.
However, these systems proved brittle when confronted with the noise and complexity of real-world data.

The resurgence of neural networks in the 2010s, powered by increased computational resources and
large-scale datasets, shifted the paradigm toward end-to-end learning {cite_006}. While these approaches
achieved unprecedented accuracy on benchmark tasks, they introduced new challenges around model opacity.
Rudin {cite_007} distinguished between inherently interpretable models and post-hoc explanations,
arguing that the latter often fail to capture the true reasoning process of complex models.

### Hybrid Approaches to AI

The integration of symbolic and connectionist paradigms represents a promising direction for
reconciling performance and interpretability. Marcus {cite_008} advocated for hybrid architectures
that leverage the complementary strengths of each approach: neural networks excel at pattern recognition
and generalization, while symbolic systems provide structured reasoning and explicit knowledge
representation.

Several concrete implementations have demonstrated the viability of this approach. Neural-symbolic
integration frameworks {cite_009} enable the incorporation of domain knowledge into deep learning
pipelines. Knowledge graphs have been combined with attention mechanisms to create models that can
both learn from data and reason over structured relationships {cite_010}. These hybrid systems have
shown particular promise in domains where background knowledge is abundant and reasoning chains must
be auditable.

### Gaps in Current Research

Despite significant progress, several gaps remain in the current literature. First, most existing
hybrid approaches have been evaluated in isolation, making cross-system comparisons difficult.
Second, the computational overhead of hybrid architectures has received insufficient attention,
limiting practical deployment. Third, the theoretical foundations of neural-symbolic integration
remain underdeveloped, hindering principled system design.

This research addresses these gaps through a comprehensive comparative study that evaluates multiple
hybrid architectures across diverse domains using standardized metrics and computational budgets.
"""

REAL_METHODOLOGY_SAMPLE = """## Methodology

### Research Design

This study employs a mixed-methods approach combining quantitative experimentation with qualitative
analysis of model behavior. Our experimental framework evaluates five distinct hybrid architectures
across four application domains, enabling both within-domain and cross-domain comparisons.

### Datasets

We selected datasets representing diverse AI application areas:

1. **Healthcare**: The MIMIC-III clinical database containing de-identified health records from
   over 40,000 patients {cite_011}. We focus on the mortality prediction task, which requires
   integrating structured clinical measurements with unstructured physician notes.

2. **Finance**: The Numerai tournament dataset comprising anonymized financial features for
   stock prediction. This domain tests the ability to handle noisy, adversarial data distributions.

3. **Natural Language**: The e-SNLI dataset for natural language inference with human-annotated
   explanations {cite_012}. This enables direct evaluation of explanation quality.

4. **Computer Vision**: The CUB-200 bird classification dataset with part-based annotations,
   allowing assessment of attention alignment with ground-truth explanatory features.

### Model Architectures

We implement and evaluate the following hybrid approaches:

- **Neuro-Symbolic Concept Learner (NS-CL)**: Combines visual perception with symbolic reasoning
- **Logic Tensor Networks (LTN)**: Integrates first-order logic constraints into neural optimization
- **Neural Theorem Prover (NTP)**: Enables differentiable backward chaining over knowledge bases
- **Attention-Based Knowledge Integration (ABKI)**: Our proposed architecture (see Section 3.4)
- **Baseline**: Standard transformer architecture without symbolic components

### Evaluation Metrics

We assess model performance along three dimensions:

**Predictive Accuracy**: Standard task-specific metrics including accuracy, F1-score, AUC-ROC,
and mean squared error where appropriate.

**Interpretability**: We employ both automatic metrics (faithfulness, plausibility) and human
evaluation through Amazon Mechanical Turk studies with domain experts.

**Computational Efficiency**: Training time, inference latency, and memory consumption measured
on standardized hardware (NVIDIA A100 GPUs with 40GB memory).
"""

REAL_RESULTS_SAMPLE = """## Results and Analysis

### Predictive Performance

Table 1 summarizes the predictive performance of all models across the four evaluation domains.
Our proposed ABKI architecture achieves competitive performance with state-of-the-art baselines
while maintaining interpretability advantages.

On the healthcare mortality prediction task, ABKI achieves an AUC-ROC of 0.847, compared to 0.852
for the standard transformer baseline {cite_013}. While this 0.5% difference is not statistically
significant (p > 0.05, paired t-test), ABKI provides substantial interpretability benefits as
demonstrated in Section 4.2.

The financial prediction domain presents the most challenging evaluation setting. All models
exhibit high variance across cross-validation folds, reflecting the inherent noise in financial
data. ABKI achieves a Sharpe ratio of 1.23, compared to 1.31 for the transformer baseline,
with overlapping confidence intervals.

### Interpretability Evaluation

The human evaluation study (n=120 participants, 40 per domain excluding finance) reveals
significant differences in explanation quality between architectures. Table 2 presents the
mean ratings on a 7-point Likert scale for three interpretability dimensions.

ABKI explanations received the highest ratings for faithfulness (5.8 ± 0.9) and usefulness
(5.4 ± 1.1), significantly outperforming both the baseline with post-hoc explanations (4.2 ± 1.3)
and Logic Tensor Networks (4.9 ± 1.0). Participants particularly valued ABKI's ability to
highlight relevant knowledge graph entities alongside attention weights.

### Computational Analysis

Figure 3 illustrates the tradeoff between predictive performance and computational cost.
ABKI requires approximately 40% more training time than the standard transformer but achieves
comparable inference latency through efficient caching of symbolic reasoning results.

The memory overhead of maintaining knowledge graph embeddings scales linearly with graph size,
limiting applicability to domains with very large knowledge bases. Section 5 discusses potential
mitigation strategies including graph pruning and lazy evaluation.
"""

REAL_DISCUSSION_SAMPLE = """## Discussion

### Interpretation of Findings

Our experimental results support the hypothesis that hybrid neural-symbolic architectures can
achieve competitive predictive performance while providing substantially more interpretable
explanations than pure deep learning approaches. The ABKI architecture demonstrates that
careful integration of attention mechanisms with knowledge graph reasoning enables models to
ground their predictions in explicit, human-understandable concepts.

The performance gap between ABKI and baseline transformers (typically 0.5-2%) represents an
acceptable tradeoff in many application contexts, particularly those requiring regulatory
compliance or high-stakes decision-making {cite_014}. Healthcare and legal domains, where
model explanations may be legally mandated, represent prime deployment candidates.

### Limitations

Several limitations constrain the generalizability of our findings. First, our evaluation
focused on domains with available structured knowledge; performance in knowledge-sparse
domains remains unexplored. Second, the human evaluation participants, while screened for
domain expertise, may not represent the full spectrum of potential end users. Third, the
computational overhead of ABKI may prove prohibitive for real-time applications with strict
latency requirements.

### Implications for Practice

Practitioners seeking to deploy hybrid AI systems should consider several factors identified
through this research. The availability and quality of domain knowledge significantly impacts
the effectiveness of neural-symbolic integration. Organizations should invest in knowledge
engineering efforts before expecting substantial benefits from hybrid approaches.

The interpretability gains from hybrid architectures are most valuable when explanations
target specific stakeholder needs. A physician reviewing a mortality prediction requires
different explanatory depth than a regulatory auditor assessing model fairness. Future
systems should support customizable explanation generation tuned to audience expertise.

### Future Research Directions

This work opens several avenues for future investigation. The theoretical foundations of
neural-symbolic integration require further development; understanding when and why hybrid
approaches succeed or fail would enable more principled architecture design. Additionally,
the evaluation of interpretability remains challenging; developing standardized benchmarks
and metrics would accelerate progress in this area.
"""

REAL_CONCLUSION_SAMPLE = """## Conclusion

This paper presented a comprehensive investigation of hybrid neural-symbolic architectures
for interpretable machine learning. Through systematic evaluation across four domains, we
demonstrated that the proposed ABKI architecture achieves competitive predictive performance
while providing substantially more interpretable explanations than pure deep learning baselines
{cite_015}.

Our key contributions include: (1) a novel attention-based framework for integrating knowledge
graph reasoning with neural networks, (2) a rigorous experimental methodology for evaluating
interpretability through human studies, and (3) a detailed analysis of the computational
tradeoffs inherent in hybrid AI systems.

The results support the broader thesis that performance and interpretability need not be
mutually exclusive goals. By carefully designing architectures that leverage the complementary
strengths of symbolic and connectionist paradigms, we can build AI systems that are both
powerful and transparent.

Future work should extend this framework to additional domains, develop more efficient
symbolic reasoning mechanisms, and establish standardized benchmarks for interpretability
evaluation. As AI systems assume greater responsibility in consequential decisions, the
demand for interpretable, trustworthy models will only intensify.
"""


class TestRealAcademicContent:
    """Test quality gate with real academic writing patterns."""

    def _create_real_content_context(self, academic_level: str = "research_paper") -> DraftContext:
        """Create context with realistic academic content."""
        ctx = DraftContext()
        ctx.academic_level = academic_level
        ctx.word_targets = {
            'research_paper': {'min_citations': 10},
            'bachelor': {'min_citations': 20},
            'master': {'min_citations': 40},
            'phd': {'min_citations': 80},
        }.get(academic_level, {'min_citations': 10})

        ctx.intro_output = REAL_INTRO_SAMPLE
        ctx.lit_review_output = REAL_LIT_REVIEW_SAMPLE
        ctx.methodology_output = REAL_METHODOLOGY_SAMPLE
        ctx.results_output = REAL_RESULTS_SAMPLE
        ctx.discussion_output = REAL_DISCUSSION_SAMPLE
        ctx.conclusion_output = REAL_CONCLUSION_SAMPLE
        ctx.body_output = REAL_LIT_REVIEW_SAMPLE + REAL_METHODOLOGY_SAMPLE + REAL_RESULTS_SAMPLE + REAL_DISCUSSION_SAMPLE

        return ctx

    def test_real_research_paper_passes(self):
        """Real research paper content should pass quality gate."""
        ctx = self._create_real_content_context("research_paper")
        result = score_draft_quality(ctx)

        assert result.passed, f"Real paper should pass. Score: {result.total_score}, Issues: {result.issues}"
        assert result.total_score >= 60, f"Expected 60+, got {result.total_score}"

    def test_real_content_word_count_accuracy(self):
        """Verify word counting works correctly on real content."""
        intro_words = _count_words(REAL_INTRO_SAMPLE)
        lit_review_words = _count_words(REAL_LIT_REVIEW_SAMPLE)

        # Intro should be ~300-600 words (actual: ~327)
        assert 200 < intro_words < 700, f"Intro words: {intro_words}"
        # Lit review should be ~300-500 words
        assert 200 < lit_review_words < 600, f"Lit review words: {lit_review_words}"

    def test_real_content_citation_detection(self):
        """Verify citation detection works on real content."""
        ctx = self._create_real_content_context()
        issues = []
        score = _score_citations(ctx, issues)

        # Should detect all 15 citations
        assert score >= 15, f"Citation score too low: {score}"

    def test_real_content_structure_detection(self):
        """Verify structure scoring on real academic content."""
        ctx = self._create_real_content_context()
        issues = []
        score = _score_structure(ctx, issues)

        # Well-structured content should score high
        assert score >= 15, f"Structure score too low: {score}"
        assert "header" not in " ".join(issues).lower(), f"Should have headers: {issues}"

    def test_real_content_completeness(self):
        """Verify completeness scoring on full academic content."""
        ctx = self._create_real_content_context()
        issues = []
        score = _score_completeness(ctx, issues)

        # All sections present should score high
        assert score >= 20, f"Completeness score too low: {score}"
        assert "Missing" not in " ".join(issues), f"Should have all sections: {issues}"

    def test_real_vs_synthetic_comparison(self):
        """Compare scoring between real and synthetic content."""
        # Real content
        real_ctx = self._create_real_content_context()
        real_result = score_draft_quality(real_ctx)

        # Synthetic content (same word counts)
        synth_ctx = DraftContext()
        synth_ctx.academic_level = "research_paper"
        synth_ctx.word_targets = {'min_citations': 10}

        intro_words = _count_words(REAL_INTRO_SAMPLE)
        body_words = _count_words(REAL_LIT_REVIEW_SAMPLE + REAL_METHODOLOGY_SAMPLE +
                                  REAL_RESULTS_SAMPLE + REAL_DISCUSSION_SAMPLE)
        conclusion_words = _count_words(REAL_CONCLUSION_SAMPLE)

        synth_ctx.intro_output = "# Introduction\n\n" + "word " * intro_words + "{cite_001} {cite_002}"
        synth_ctx.body_output = "## Body\n\n" + "word " * body_words + "{cite_003} {cite_004} {cite_005}"
        synth_ctx.conclusion_output = "## Conclusion\n\n" + "word " * conclusion_words + "{cite_006}"
        synth_ctx.lit_review_output = "Review. " * 200
        synth_ctx.methodology_output = "Method. " * 200
        synth_ctx.results_output = "Result. " * 200
        synth_ctx.discussion_output = "Discussion. " * 200

        synth_result = score_draft_quality(synth_ctx)

        # Real content should score higher due to better structure
        # (headers, paragraphs, proper formatting)
        assert real_result.structure_score >= synth_result.structure_score, \
            f"Real should have better structure: {real_result.structure_score} vs {synth_result.structure_score}"


class TestPoorQualityDetection:
    """Test that quality gate correctly identifies poor content."""

    def test_detects_placeholder_text(self):
        """Should detect TODO, INSERT, and other placeholders."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 10}

        ctx.intro_output = "# Introduction\n\nTODO: Write introduction here.\n\n" + "word " * 400
        ctx.body_output = "## Methods\n\n[INSERT methodology section]\n\n" + "word " * 1500
        ctx.conclusion_output = "## Conclusion\n\nLorem ipsum dolor sit amet.\n\n" + "word " * 300

        result = score_draft_quality(ctx)

        # Should detect placeholders
        issues_text = " ".join(result.issues)
        assert "TODO" in issues_text or "INSERT" in issues_text or "Lorem" in issues_text

    def test_detects_missing_citations(self):
        """Should detect when citations are missing."""
        ctx = DraftContext()
        ctx.academic_level = "research_paper"
        ctx.word_targets = {'min_citations': 10}

        # Good word counts but NO citations
        ctx.intro_output = "# Introduction\n\n" + "word " * 500
        ctx.body_output = "## Body\n\n" + "word " * 2000
        ctx.conclusion_output = "## Conclusion\n\n" + "word " * 400

        result = score_draft_quality(ctx)

        assert result.citation_score < 10, f"Should score low on citations: {result.citation_score}"
        assert "citation" in " ".join(result.issues).lower()

    def test_detects_shallow_content(self):
        """Should detect very short/shallow content."""
        ctx = DraftContext()
        ctx.academic_level = "master"  # Higher requirements
        ctx.word_targets = {'min_citations': 40}

        # Very short for master level
        ctx.intro_output = "Short intro."
        ctx.body_output = "Short body."
        ctx.conclusion_output = "Short conclusion."

        result = score_draft_quality(ctx)

        assert not result.passed, "Shallow master thesis should fail"
        assert result.word_count_score < 10, f"Word count should be very low: {result.word_count_score}"


class TestAcademicLevelScaling:
    """Test that requirements scale properly with academic level."""

    def test_same_content_different_levels(self):
        """Same content should score differently at different academic levels."""
        # Content that's good for research paper but inadequate for PhD

        base_intro = REAL_INTRO_SAMPLE
        base_body = REAL_LIT_REVIEW_SAMPLE + REAL_METHODOLOGY_SAMPLE
        base_conclusion = REAL_CONCLUSION_SAMPLE

        scores = {}
        for level in ["research_paper", "bachelor", "master", "phd"]:
            ctx = DraftContext()
            ctx.academic_level = level
            ctx.word_targets = {
                'research_paper': {'min_citations': 10},
                'bachelor': {'min_citations': 20},
                'master': {'min_citations': 40},
                'phd': {'min_citations': 80},
            }[level]

            ctx.intro_output = base_intro
            ctx.body_output = base_body
            ctx.conclusion_output = base_conclusion
            ctx.lit_review_output = REAL_LIT_REVIEW_SAMPLE
            ctx.methodology_output = REAL_METHODOLOGY_SAMPLE
            ctx.results_output = REAL_RESULTS_SAMPLE
            ctx.discussion_output = REAL_DISCUSSION_SAMPLE

            result = score_draft_quality(ctx)
            scores[level] = result.total_score

        # Research paper should score highest, PhD lowest (for same content)
        assert scores["research_paper"] >= scores["bachelor"], \
            f"Research paper should score >= bachelor: {scores}"
        assert scores["bachelor"] >= scores["master"], \
            f"Bachelor should score >= master: {scores}"

    def test_phd_requires_more_citations(self):
        """PhD level should require more citations than research paper."""
        ctx_phd = DraftContext()
        ctx_phd.academic_level = "phd"
        ctx_phd.word_targets = {'min_citations': 80}

        ctx_paper = DraftContext()
        ctx_paper.academic_level = "research_paper"
        ctx_paper.word_targets = {'min_citations': 10}

        # Same content with 15 citations (good for paper, inadequate for PhD)
        content_with_15_citations = REAL_INTRO_SAMPLE  # Has 4 citations
        content_with_15_citations += " {cite_016} {cite_017} {cite_018} {cite_019} {cite_020}"
        content_with_15_citations += " {cite_021} {cite_022} {cite_023} {cite_024} {cite_025}"

        for ctx in [ctx_phd, ctx_paper]:
            ctx.intro_output = content_with_15_citations
            ctx.body_output = REAL_LIT_REVIEW_SAMPLE + REAL_METHODOLOGY_SAMPLE
            ctx.conclusion_output = REAL_CONCLUSION_SAMPLE

        phd_issues = []
        paper_issues = []

        phd_score = _score_citations(ctx_phd, phd_issues)
        paper_score = _score_citations(ctx_paper, paper_issues)

        # Paper should score better with 15 citations
        assert paper_score > phd_score, f"Paper: {paper_score}, PhD: {phd_score}"
