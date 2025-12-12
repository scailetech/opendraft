#!/usr/bin/env python3
"""
ABOUTME: Pytest configuration with API mocks for offline testing
ABOUTME: Mocks Gemini, Claude, OpenAI, and citation APIs (Crossref, Semantic Scholar, arXiv, PubMed)
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, Any, List


# ======================
# LLM API Mocks
# ======================


@pytest.fixture
def mock_gemini_api():
    """
    Mock Gemini API to prevent quota exhaustion in tests.

    Returns realistic responses for generate_content() calls.
    """
    with patch('google.generativeai.GenerativeModel') as mock_model:
        # Create mock response
        mock_response = Mock()
        mock_response.text = "This is a mocked Gemini response for testing purposes."
        mock_response.candidates = [
            Mock(
                content=Mock(parts=[Mock(text="Mocked response")]),
                safety_ratings=[],
                finish_reason=1
            )
        ]

        # Configure model mock
        mock_instance = Mock()
        mock_instance.generate_content.return_value = mock_response
        mock_model.return_value = mock_instance

        yield mock_model


@pytest.fixture
def mock_claude_api():
    """
    Mock Claude API (Anthropic) for offline testing.

    Returns realistic responses for messages.create() calls.
    """
    with patch('anthropic.Anthropic') as mock_anthropic:
        # Create mock response
        mock_message = Mock()
        mock_message.content = [Mock(text="This is a mocked Claude response for testing purposes.")]
        mock_message.id = "msg_test123"
        mock_message.model = "claude-sonnet-4.5"
        mock_message.role = "assistant"
        mock_message.stop_reason = "end_turn"
        mock_message.usage = Mock(input_tokens=100, output_tokens=50)

        # Configure client mock
        mock_client = Mock()
        mock_client.messages.create.return_value = mock_message
        mock_anthropic.return_value = mock_client

        yield mock_anthropic


@pytest.fixture
def mock_openai_api():
    """
    Mock OpenAI API for offline testing.

    Returns realistic responses for chat.completions.create() calls.
    """
    with patch('openai.OpenAI') as mock_openai:
        # Create mock response
        mock_choice = Mock()
        mock_choice.message.content = "This is a mocked OpenAI response for testing purposes."
        mock_choice.finish_reason = "stop"

        mock_response = Mock()
        mock_response.choices = [mock_choice]
        mock_response.id = "chatcmpl-test123"
        mock_response.model = "gpt-4"
        mock_response.usage = Mock(prompt_tokens=100, completion_tokens=50, total_tokens=150)

        # Configure client mock
        mock_client = Mock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai.return_value = mock_client

        yield mock_openai


# ======================
# Citation API Mocks
# ======================


@pytest.fixture
def mock_crossref_api():
    """
    Mock Crossref API for offline testing.

    Returns realistic paper metadata for citation queries.
    """
    def mock_response(*args, **kwargs) -> Dict[str, Any]:
        """Return mock Crossref API response"""
        return {
            "status": "ok",
            "message-type": "work-list",
            "message": {
                "items": [
                    {
                        "DOI": "10.1234/test.12345",
                        "title": ["Mock Research Paper Title on AI Pricing Models"],
                        "author": [
                            {"given": "John", "family": "Doe"},
                            {"given": "Jane", "family": "Smith"}
                        ],
                        "published": {"date-parts": [[2024, 1, 15]]},
                        "container-title": ["Journal of Mock Research"],
                        "volume": "42",
                        "issue": "3",
                        "page": "123-145",
                        "type": "journal-article",
                        "URL": "https://doi.org/10.1234/test.12345",
                        "abstract": "This is a mock abstract for testing purposes."
                    },
                    {
                        "DOI": "10.5678/test.67890",
                        "title": ["Another Mock Paper on Pricing Strategies"],
                        "author": [
                            {"given": "Alice", "family": "Johnson"}
                        ],
                        "published": {"date-parts": [[2023, 6, 10]]},
                        "container-title": ["AI Research Quarterly"],
                        "volume": "15",
                        "issue": "2",
                        "page": "200-220",
                        "type": "journal-article",
                        "URL": "https://doi.org/10.5678/test.67890"
                    }
                ],
                "total-results": 2
            }
        }

    with patch('requests.get') as mock_get:
        mock_resp = Mock()
        mock_resp.json.return_value = mock_response()
        mock_resp.status_code = 200
        mock_resp.ok = True
        mock_get.return_value = mock_resp

        yield mock_get


@pytest.fixture
def mock_semantic_scholar_api():
    """
    Mock Semantic Scholar API for offline testing.

    Returns realistic paper metadata for CS/ML papers.
    """
    def mock_response(*args, **kwargs) -> Dict[str, Any]:
        """Return mock Semantic Scholar API response"""
        return {
            "total": 2,
            "offset": 0,
            "data": [
                {
                    "paperId": "abc123def456",
                    "title": "Deep Learning Approaches to Pricing Optimization",
                    "authors": [
                        {"authorId": "123", "name": "Bob Wilson"},
                        {"authorId": "456", "name": "Carol Taylor"}
                    ],
                    "year": 2024,
                    "venue": "International Conference on Machine Learning",
                    "citationCount": 42,
                    "influentialCitationCount": 15,
                    "url": "https://www.semanticscholar.org/paper/abc123def456",
                    "abstract": "Mock abstract about deep learning pricing models.",
                    "fieldsOfStudy": ["Computer Science", "Economics"]
                },
                {
                    "paperId": "xyz789uvw012",
                    "title": "Neural Networks for Dynamic Pricing",
                    "authors": [
                        {"authorId": "789", "name": "David Chen"}
                    ],
                    "year": 2023,
                    "venue": "NeurIPS",
                    "citationCount": 28,
                    "url": "https://www.semanticscholar.org/paper/xyz789uvw012",
                    "abstract": "Mock abstract on neural pricing strategies."
                }
            ]
        }

    with patch('requests.get') as mock_get:
        mock_resp = Mock()
        mock_resp.json.return_value = mock_response()
        mock_resp.status_code = 200
        mock_resp.ok = True
        mock_get.return_value = mock_resp

        yield mock_get


@pytest.fixture
def mock_arxiv_api():
    """
    Mock arXiv API for offline testing.

    Returns realistic preprint metadata in XML format.
    """
    mock_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>arXiv Query: search_query=pricing+models</title>
  <entry>
    <id>http://arxiv.org/abs/2401.12345v1</id>
    <title>Mock arXiv Paper on AI Pricing</title>
    <summary>This is a mock abstract for arXiv testing.</summary>
    <author>
      <name>Emma Martinez</name>
    </author>
    <published>2024-01-15T00:00:00Z</published>
    <updated>2024-01-15T00:00:00Z</updated>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <link href="http://arxiv.org/abs/2401.12345v1" rel="alternate" type="text/html"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2312.98765v2</id>
    <title>Another Mock Preprint on Pricing Strategies</title>
    <summary>Mock summary about pricing optimization.</summary>
    <author>
      <name>Frank Rodriguez</name>
    </author>
    <published>2023-12-20T00:00:00Z</published>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>'''

    with patch('requests.get') as mock_get:
        mock_resp = Mock()
        mock_resp.text = mock_xml
        mock_resp.content = mock_xml.encode('utf-8')
        mock_resp.status_code = 200
        mock_resp.ok = True
        mock_get.return_value = mock_resp

        yield mock_get


@pytest.fixture
def mock_pubmed_api():
    """
    Mock PubMed API for offline testing.

    Returns realistic medical/biology paper metadata in XML format.
    """
    mock_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>12345678</PMID>
      <Article>
        <ArticleTitle>Mock Medical Research on Healthcare Pricing</ArticleTitle>
        <Abstract>
          <AbstractText>This is a mock abstract for PubMed testing.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author>
            <LastName>Garcia</LastName>
            <ForeName>Maria</ForeName>
          </Author>
          <Author>
            <LastName>Lee</LastName>
            <ForeName>James</ForeName>
          </Author>
        </AuthorList>
        <Journal>
          <Title>Journal of Healthcare Economics</Title>
          <JournalIssue>
            <Volume>25</Volume>
            <Issue>4</Issue>
            <PubDate>
              <Year>2024</Year>
              <Month>Mar</Month>
            </PubDate>
          </JournalIssue>
        </Journal>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>'''

    with patch('requests.get') as mock_get:
        mock_resp = Mock()
        mock_resp.text = mock_xml
        mock_resp.content = mock_xml.encode('utf-8')
        mock_resp.status_code = 200
        mock_resp.ok = True
        mock_get.return_value = mock_resp

        yield mock_get


# ======================
# Combined Fixture for All API Mocks
# ======================


@pytest.fixture
def all_api_mocks(
    mock_gemini_api,
    mock_claude_api,
    mock_openai_api,
    mock_crossref_api,
    mock_semantic_scholar_api,
    mock_arxiv_api,
    mock_pubmed_api
):
    """
    Convenience fixture that activates ALL API mocks simultaneously.

    Use this for integration tests that need complete offline testing.

    Example:
        def test_full_draft_generation(all_api_mocks):
            # Test runs with all APIs mocked
            result = generate_draft("AI Pricing Models")
            assert result is not None
    """
    return {
        "gemini": mock_gemini_api,
        "claude": mock_claude_api,
        "openai": mock_openai_api,
        "crossref": mock_crossref_api,
        "semantic_scholar": mock_semantic_scholar_api,
        "arxiv": mock_arxiv_api,
        "pubmed": mock_pubmed_api
    }


# ======================
# Pytest Configuration
# ======================


def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests requiring API access"
    )
    config.addinivalue_line(
        "markers", "unit: marks unit tests (fast, isolated)"
    )
