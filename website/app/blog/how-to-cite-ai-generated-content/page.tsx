// ABOUTME: Guide to citing AI-generated content in academic papers - SEO target (8.1k searches/mo)
// ABOUTME: Keywords: how to cite AI content, cite ChatGPT APA, AI citation format

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getBlogPost, generateBlogPostMetadata, generateBlogPostSchema } from "@/lib/blog-posts";

const post = getBlogPost("how-to-cite-ai-generated-content")!;

export const metadata = generateBlogPostMetadata(post);

export default function HowToCiteAIContent() {
  const schema = generateBlogPostSchema(post);

  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema)
        }}
      />

      <div className="mb-4 flex gap-2">
        <Badge>{post.category}</Badge>
        <Badge variant="outline">{post.readTime}</Badge>
        <span className="text-sm text-muted-foreground">
          {new Date(post.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </span>
      </div>

      <h1>How to Cite AI-Generated Content: Complete Guide (APA, MLA, Chicago) 2025</h1>

      <p className="text-xl text-muted-foreground">
        Learn the proper way to cite ChatGPT, Claude, and other AI-generated content in academic papers. This comprehensive guide covers APA 7th Edition, MLA 9th Edition, and Chicago 17th Edition citation styles with real examples.
      </p>

      <h2>Introduction: Do You Need to Cite AI Content?</h2>

      <p>
        <strong>Yes, absolutely.</strong> If you use AI-generated text, ideas, or assistance in your academic work, you must cite it. Failing to disclose AI use can constitute <strong>academic dishonesty</strong> at most institutions.
      </p>

      <p>
        This guide will show you exactly how to cite:
      </p>
      <ul>
        <li>ChatGPT (GPT-3.5, GPT-4, GPT-4o)</li>
        <li>Claude (Sonnet, Opus)</li>
        <li>Google Gemini (formerly Bard)</li>
        <li>Microsoft Copilot</li>
        <li>Other AI writing tools and thesis generators</li>
      </ul>

      <h3>When to Cite AI</h3>
      <ul>
        <li>✅ <strong>Direct quotes:</strong> Any text directly copied from AI output</li>
        <li>✅ <strong>Paraphrased ideas:</strong> AI-generated concepts you rewrote in your own words</li>
        <li>✅ <strong>Code or data:</strong> AI-generated code, calculations, or analyses</li>
        <li>✅ <strong>Figures and tables:</strong> AI-created visualizations or data tables</li>
        <li>⚠️ <strong>Brainstorming:</strong> Depends on your institution (check policy)</li>
      </ul>

      <h2>APA 7th Edition (2025 Update)</h2>

      <p>
        The American Psychological Association (APA) released official guidance on citing AI in April 2023, updated for ChatGPT and similar tools.
      </p>

      <h3>Basic Format for ChatGPT</h3>

      <div className="bg-muted p-4 rounded-lg my-4 font-mono text-sm">
        <strong>In-text citation:</strong><br />
        (OpenAI, 2025)<br /><br />
        <strong>Reference list entry:</strong><br />
        OpenAI. (2025). <em>ChatGPT (GPT-4)</em> [Large language model]. https://chat.openai.com/
      </div>

      <h3>Example: Quoting ChatGPT in Text</h3>

      <div className="bg-muted p-4 rounded-lg my-4 text-sm">
        <p>
          When asked to explain transformers, ChatGPT stated, &quot;Transformers are a type of deep learning model introduced in 2017 that uses self-attention mechanisms to process sequential data&quot; (OpenAI, 2025).
        </p>
      </div>

      <h3>Example: Describing ChatGPT&apos;s Response</h3>

      <div className="bg-muted p-4 rounded-lg my-4 text-sm">
        <p>
          ChatGPT summarized the key advantages of transformer models over RNNs, including parallelization and better long-range dependency handling (OpenAI, 2025).
        </p>
      </div>

      <h3>Important APA Guidelines</h3>

      <ul>
        <li><strong>Author:</strong> The company/organization (OpenAI, Anthropic, Google)</li>
        <li><strong>Year:</strong> Year you accessed it (not the model&apos;s release year)</li>
        <li><strong>Title:</strong> Name of the AI tool + model version in parentheses</li>
        <li><strong>Type:</strong> [Large language model] or [AI software]</li>
        <li><strong>URL:</strong> Link to the tool</li>
      </ul>

      <h3>APA Citations for Other AI Tools</h3>

      <div className="bg-muted p-4 rounded-lg my-4 font-mono text-sm">
        <strong>Claude (Anthropic):</strong><br />
        Anthropic. (2025). <em>Claude (Sonnet 4.5)</em> [Large language model]. https://claude.ai/<br /><br />

        <strong>Google Gemini:</strong><br />
        Google. (2025). <em>Gemini 2.5</em> [Large language model]. https://gemini.google.com/<br /><br />

        <strong>Microsoft Copilot:</strong><br />
        Microsoft. (2025). <em>Microsoft Copilot</em> [AI assistant]. https://copilot.microsoft.com/
      </div>

      <h3>Including AI Conversations in Appendix (APA Recommendation)</h3>

      <p>
        APA recommends including the full AI conversation in an appendix or supplementary materials. This allows readers to see the exact prompts and responses.
      </p>

      <div className="bg-muted p-4 rounded-lg my-4 text-sm">
        <strong>In your paper:</strong><br />
        &quot;ChatGPT provided three potential research hypotheses (see Appendix A for the full conversation)&quot; (OpenAI, 2025).<br /><br />

        <strong>In Appendix A:</strong><br />
        Include the complete text of your prompts and ChatGPT&apos;s responses.
      </div>

      <h2>MLA 9th Edition</h2>

      <p>
        The Modern Language Association (MLA) provides guidance for citing generative AI as a &quot;self-contained work.&quot;
      </p>

      <h3>Basic Format for ChatGPT</h3>

      <div className="bg-muted p-4 rounded-lg my-4 font-mono text-sm">
        <strong>In-text citation:</strong><br />
        (&quot;AI-Generated Response&quot;)<br /><br />
        <strong>Works Cited entry:</strong><br />
        &quot;AI-Generated Response.&quot; <em>ChatGPT</em>, version GPT-4, OpenAI, 3 Nov. 2025, chat.openai.com.
      </div>

      <h3>Example: Quoting ChatGPT in MLA</h3>

      <div className="bg-muted p-4 rounded-lg my-4 text-sm">
        <p>
          According to ChatGPT, &quot;Shakespeare&apos;s influence on modern literature extends beyond plot devices to include innovations in character psychology&quot; (&quot;Shakespeare&apos;s Influence&quot;).
        </p>
      </div>

      <h3>MLA Format Breakdown</h3>

      <ul>
        <li><strong>Title:</strong> Brief description of the AI response in quotes (e.g., &quot;Explanation of Climate Change&quot;)</li>
        <li><strong>Container:</strong> <em>ChatGPT</em> (italicized)</li>
        <li><strong>Version:</strong> The specific model (GPT-4, GPT-3.5, etc.)</li>
        <li><strong>Publisher:</strong> OpenAI, Anthropic, Google, etc.</li>
        <li><strong>Access date:</strong> Day Month Year format</li>
        <li><strong>URL:</strong> The tool&apos;s website</li>
      </ul>

      <h3>MLA Citations for Other AI Tools</h3>

      <div className="bg-muted p-4 rounded-lg my-4 font-mono text-sm">
        <strong>Claude:</strong><br />
        &quot;Analysis of Modernist Poetry.&quot; <em>Claude</em>, version Sonnet 4.5, Anthropic, 3 Nov. 2025, claude.ai.<br /><br />

        <strong>Google Gemini:</strong><br />
        &quot;Summary of Roman History.&quot; <em>Gemini</em>, version 2.5, Google, 3 Nov. 2025, gemini.google.com.
      </div>

      <h2>Chicago Manual of Style (17th Edition)</h2>

      <p>
        Chicago style treats AI-generated content similarly to personal communications or software.
      </p>

      <h3>Notes-Bibliography System</h3>

      <div className="bg-muted p-4 rounded-lg my-4 font-mono text-sm">
        <strong>Footnote (first reference):</strong><br />
        1. Text generated by ChatGPT (GPT-4), OpenAI, November 3, 2025, https://chat.openai.com.<br /><br />

        <strong>Shortened footnote (subsequent references):</strong><br />
        2. ChatGPT, GPT-4.<br /><br />

        <strong>Bibliography entry:</strong><br />
        OpenAI. ChatGPT (GPT-4). Large language model. November 3, 2025. https://chat.openai.com.
      </div>

      <h3>Author-Date System</h3>

      <div className="bg-muted p-4 rounded-lg my-4 font-mono text-sm">
        <strong>In-text citation:</strong><br />
        (OpenAI 2025)<br /><br />

        <strong>Reference list entry:</strong><br />
        OpenAI. 2025. ChatGPT (GPT-4). Large language model. Accessed November 3, 2025. https://chat.openai.com.
      </div>

      <h3>Chicago Format for Other AI Tools</h3>

      <div className="bg-muted p-4 rounded-lg my-4 font-mono text-sm">
        <strong>Claude (Notes-Bibliography):</strong><br />
        1. Text generated by Claude (Sonnet 4.5), Anthropic, November 3, 2025, https://claude.ai.<br /><br />

        <strong>Google Gemini (Author-Date):</strong><br />
        Google. 2025. Gemini 2.5. Large language model. Accessed November 3, 2025. https://gemini.google.com.
      </div>

      <h2>IEEE Citation Style</h2>

      <p>
        For engineering and technical fields using IEEE style:
      </p>

      <div className="bg-muted p-4 rounded-lg my-4 font-mono text-sm">
        <strong>In-text citation:</strong><br />
        [1]<br /><br />

        <strong>Reference list:</strong><br />
        [1] OpenAI, &quot;ChatGPT (GPT-4),&quot; Large language model, 2025. [Online]. Available: https://chat.openai.com. [Accessed: Nov. 3, 2025].
      </div>

      <h2>How to Cite Specific AI Use Cases</h2>

      <h3>Citing AI-Generated Code</h3>

      <div className="bg-muted p-4 rounded-lg my-4 text-sm">
        <strong>APA Format:</strong><br />
        The following Python function was generated with assistance from ChatGPT (OpenAI, 2025):<br />
        <code className="block mt-2 bg-background p-2 rounded">
          def fibonacci(n):<br />
          &nbsp;&nbsp;if n &lt;= 1: return n<br />
          &nbsp;&nbsp;return fibonacci(n-1) + fibonacci(n-2)
        </code>
      </div>

      <h3>Citing AI-Generated Tables or Figures</h3>

      <div className="bg-muted p-4 rounded-lg my-4 text-sm">
        <strong>Caption under figure:</strong><br />
        <em>Figure 1. Comparison of Machine Learning Models</em><br />
        Note. Generated with assistance from ChatGPT (OpenAI, 2025).
      </div>

      <h3>Citing AI as a Research Assistant</h3>

      <div className="bg-muted p-4 rounded-lg my-4 text-sm">
        <strong>In Methods section:</strong><br />
        ChatGPT (GPT-4; OpenAI, 2025) was used to generate initial research hypotheses, which were then refined through literature review and expert consultation.
      </div>

      <h2>Ethical Considerations</h2>

      <h3>Disclosure Requirements</h3>

      <p>
        Many journals and institutions require a disclosure statement when AI is used. Example:
      </p>

      <div className="bg-muted p-4 rounded-lg my-4 text-sm">
        <strong>Author Note / Acknowledgments:</strong><br />
        &quot;ChatGPT (GPT-4; OpenAI, 2025) was used to assist with literature review organization and initial outline generation. All content was verified against primary sources, and final writing decisions were made by the authors.&quot;
      </div>

      <h3>What NOT to Do</h3>

      <ul>
        <li>❌ <strong>Don&apos;t list AI as a co-author:</strong> AI cannot meet authorship criteria (accountability, contribution)</li>
        <li>❌ <strong>Don&apos;t hide AI use:</strong> Undisclosed AI assistance can be considered academic dishonesty</li>
        <li>❌ <strong>Don&apos;t cite fabricated sources:</strong> Always verify AI-provided citations against original sources</li>
        <li>❌ <strong>Don&apos;t rely solely on AI:</strong> You must add your own analysis and critical thinking</li>
      </ul>

      <div className="bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-500 p-6 my-8 not-prose">
        <p className="font-semibold flex items-center gap-2">
          <span>⚠️</span> Critical Warning: Citation Hallucination
        </p>
        <p className="text-sm mt-2">
          <strong>Never cite papers that AI claims exist without verifying them first.</strong> Studies show ChatGPT and similar tools fabricate 40-70% of academic citations. Every AI-provided reference MUST be verified against Google Scholar, PubMed, or the original source.
        </p>
      </div>

      <h2>Institution-Specific Policies</h2>

      <p>
        Before using AI in your academic work, check your institution&apos;s policy. Requirements vary widely:
      </p>

      <h3>Common Policy Categories</h3>

      <ul>
        <li><strong>Allowed with disclosure:</strong> Use permitted if properly cited (most common in 2025)</li>
        <li><strong>Limited use:</strong> Only for brainstorming/outlining, not final content</li>
        <li><strong>Prohibited:</strong> No AI use allowed in academic work</li>
        <li><strong>Varies by assignment:</strong> Check with individual instructors</li>
      </ul>

      <h3>Where to Find Your Institution&apos;s Policy</h3>

      <ul>
        <li>Academic integrity / honor code page</li>
        <li>Writing center guidelines</li>
        <li>Course syllabi</li>
        <li>Ask your thesis advisor or professor directly</li>
      </ul>

      <h2>Quick Reference: Citation Comparison</h2>

      <div className="overflow-x-auto my-8">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Style</th>
              <th className="text-left">In-Text Citation</th>
              <th className="text-left">Reference Format</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>APA 7</strong></td>
              <td>(OpenAI, 2025)</td>
              <td>OpenAI. (2025). <em>ChatGPT (GPT-4)</em> [Large language model]. https://chat.openai.com/</td>
            </tr>
            <tr>
              <td><strong>MLA 9</strong></td>
              <td>(&quot;Response Title&quot;)</td>
              <td>&quot;Response Title.&quot; <em>ChatGPT</em>, version GPT-4, OpenAI, 3 Nov. 2025, chat.openai.com.</td>
            </tr>
            <tr>
              <td><strong>Chicago</strong></td>
              <td>(OpenAI 2025) or [1]</td>
              <td>OpenAI. 2025. ChatGPT (GPT-4). Large language model. https://chat.openai.com.</td>
            </tr>
            <tr>
              <td><strong>IEEE</strong></td>
              <td>[1]</td>
              <td>[1] OpenAI, &quot;ChatGPT (GPT-4),&quot; 2025. [Online]. Available: https://chat.openai.com.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Tools to Help Manage AI Citations</h2>

      <h3>Citation Generators</h3>
      <ul>
        <li><strong>Zotero:</strong> Free citation manager with AI citation templates</li>
        <li><strong>Mendeley:</strong> Supports custom citation types for AI tools</li>
        <li><strong>EasyBib / Citation Machine:</strong> Online generators with AI citation options</li>
      </ul>

      <h3>Verification Tools</h3>
      <ul>
        <li><strong>Google Scholar:</strong> Verify AI-provided citations</li>
        <li><strong>CrossRef:</strong> Check DOIs and publication metadata</li>
        <li><strong>OpenDraft:</strong> Auto-verified citations from 200M+ papers (no hallucination)</li>
      </ul>

      <h2>FAQs</h2>

      <h3>Q: Do I need to cite ChatGPT if I only used it for brainstorming?</h3>
      <p>
        <strong>A:</strong> It depends on your institution. Conservative approach: yes, disclose it in your methods or acknowledgments. Check your institution&apos;s policy.
      </p>

      <h3>Q: Can I list ChatGPT as a co-author?</h3>
      <p>
        <strong>A:</strong> No. Major publishers (Nature, Science, Elsevier) have explicitly stated that AI cannot be listed as an author because it cannot take accountability or fulfill authorship criteria.
      </p>

      <h3>Q: What if my institution doesn&apos;t allow AI use?</h3>
      <p>
        <strong>A:</strong> Don&apos;t use AI for that assignment. Violating academic integrity policies can result in failure or expulsion. When in doubt, ask your professor.
      </p>

      <h3>Q: How do I cite multiple AI tools used in one paper?</h3>
      <p>
        <strong>A:</strong> List each tool separately in your references. In text, cite the specific tool used for each section: &quot;ChatGPT generated the initial outline (OpenAI, 2025), which was then refined using Claude (Anthropic, 2025).&quot;
      </p>

      <h3>Q: What if the AI conversation is too long for an appendix?</h3>
      <p>
        <strong>A:</strong> Provide a summary in the appendix and note that the full conversation is available upon request. Some researchers host full transcripts on OSF or GitHub.
      </p>

      <h2>Conclusion</h2>

      <p>
        Properly citing AI-generated content is crucial for:
      </p>
      <ul>
        <li><strong>Academic integrity:</strong> Transparent about your sources</li>
        <li><strong>Reproducibility:</strong> Others can verify your work</li>
        <li><strong>Intellectual honesty:</strong> Credit where credit is due</li>
      </ul>

      <p>
        <strong>Key takeaways:</strong>
      </p>
      <ol>
        <li>Always cite AI assistance (quotes, paraphrases, or ideas)</li>
        <li>Follow your institution&apos;s AI policy</li>
        <li>Use the appropriate citation format (APA, MLA, Chicago, IEEE)</li>
        <li>Verify all AI-provided citations against original sources</li>
        <li>Disclose AI use in methods or acknowledgments</li>
        <li>Never list AI as a co-author</li>
      </ol>

      <div className="bg-primary text-primary-foreground rounded-lg p-8 text-center my-12 not-prose">
        <h3 className="text-2xl font-bold mb-4">Need Auto-Verified Citations?</h3>
        <p className="text-lg mb-6 opacity-90">
          OpenDraft automatically verifies all citations against CrossRef and arXiv. No hallucination, no fabricated papers.
        </p>
        <Link
          href="https://github.com/federicodeponte/opendraft#-quick-start-10-minutes"
          target="_blank"
          className="inline-block bg-white text-primary font-semibold px-8 py-3 rounded-lg hover:bg-white/90 transition-colors"
        >
          Try OpenDraft FREE →
        </Link>
        <p className="text-sm mt-4 opacity-75">
          100% verified citations • 200M+ research papers • Open source
        </p>
      </div>

      <hr className="my-12" />

      <p className="text-sm text-muted-foreground">
        <strong>About the Author:</strong> This guide was created by {post.author}, developer of OpenDraft. Last Updated: {new Date(post.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </p>
    </div>
  );
}
