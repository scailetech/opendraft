import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { styles, colors, darkModeMediaQuery } from './styles';

interface WelcomeEmailProps {
  fullName: string;
  position: number;
  referralCode: string;
  referralUrl: string;
}

export const WelcomeEmail = ({
  fullName = 'Student',
  position = 42,
  referralCode = 'ABC123XYZ',
  referralUrl = 'https://opendraft.xyz/waitlist/r/ABC123XYZ',
}: WelcomeEmailProps) => (
  <Html>
    <Head>
      <style>{darkModeMediaQuery}</style>
    </Head>
    <Preview>{`Welcome to OpenDraft - You're #${position} in line!`}</Preview>
    <Body style={styles.main} className="email-body">
      <Container style={styles.container} className="email-container">
        {/* Header */}
        <div style={styles.header}>
          <Text style={styles.logo}>OpenDraft</Text>
        </div>

        {/* Hero Section */}
        <div style={styles.heroSection}>
          <span className="info-badge" style={styles.badge}>
            🎓 Welcome!
          </span>
          <Heading style={styles.h1}>Welcome to OpenDraft!</Heading>
          <Text style={styles.heroText} className="email-text-muted">
            Hi {fullName}, you're successfully on the waitlist!
          </Text>
        </div>

        {/* Position Card */}
        <div className="position-card" style={styles.cardSuccessCentered}>
          <Text style={styles.positionLabel}>Your Current Position</Text>
          <Text style={styles.positionNumber}>#{position}</Text>
          <Text style={styles.textSmall} className="email-text-muted">
            We process <span style={styles.strong}>20 theses per day</span>, so you'll receive your thesis in approximately{' '}
            <span style={styles.strong}>{Math.ceil(position / 20)} days</span>.
          </Text>
        </div>

        <Hr style={styles.divider} className="email-divider" />

        {/* Referral Section */}
        <div style={{ margin: `${styles.text.margin} 0` }}>
          <Heading style={styles.h2}>🚀 Want to Skip Ahead?</Heading>
          <Text style={styles.text} className="email-text">
            Unlock <span style={styles.strong}>5 reward tiers</span> by referring friends. The more you share, the faster you move up!
          </Text>

          <div className="referral-card" style={styles.cardSuccess}>
            <Text style={styles.cardTitle}>🎁 Reward Tiers</Text>
            <Text style={styles.cardText}>🎯 <span style={styles.strong}>Tier 1:</span> 1 referral = +30 positions + Thesis Template</Text>
            <Text style={styles.cardText}>⚡ <span style={styles.strong}>Tier 2:</span> 3 referrals = +150 positions + Early Beta Access</Text>
            <Text style={styles.cardText}>💎 <span style={styles.strong}>Tier 3:</span> 5 referrals = +300 positions + Priority Support</Text>
            <Text style={styles.cardText}>👑 <span style={styles.strong}>Tier 4:</span> 10 referrals = +1000 positions + Free Generation!</Text>
            <Text style={styles.textSmall} className="email-text-muted">
              <span style={styles.strong}>Bonus:</span> Your friends who use your link get +20 positions too! 🎁
            </Text>
          </div>

          <div className="referral-card" style={styles.cardSuccessCentered}>
            <Text style={styles.positionLabel}>Your Referral Code:</Text>
            <Text style={styles.codeBlock}>{referralCode}</Text>
            <Text style={{ ...styles.positionLabel, marginTop: '12px' }}>
              Your Referral Link:
            </Text>
            <Text style={{ color: colors.primary, fontSize: styles.textSmall.fontSize, fontFamily: styles.code.fontFamily, margin: '0', wordBreak: 'break-all' as const }}>
              {referralUrl}
            </Text>
          </div>

          <div style={styles.buttonWrapper}>
            <Button style={styles.buttonPrimary} href={referralUrl}>
              Share Referral Link
            </Button>
          </div>
        </div>

        <Hr style={styles.divider} className="email-divider" />

        {/* What's Next Section */}
        <div style={{ margin: `${styles.text.margin} 0` }}>
          <Heading style={styles.h2}>What Happens Next?</Heading>
          <Text style={styles.text}>
            ✅ <span style={styles.strong}>Now:</span> You're on the waitlist
          </Text>
          <Text style={styles.text}>
            📧 <span style={styles.strong}>When processing starts:</span> You'll get a notification
          </Text>
          <Text style={styles.text}>
            🎓 <span style={styles.strong}>When complete:</span> Download links for PDF & Word files
          </Text>
        </div>

        {/* FAQ Box */}
        <div className="info-card" style={styles.cardInfo}>
          <Text style={styles.cardTitleInfo}>Quick FAQ:</Text>
          <Text style={styles.cardTextInfo}>
            <span style={styles.strong}>How long is the thesis?</span>
            <br />
            20,000+ words (80-100 pages)
          </Text>
          <Text style={styles.cardTextInfo}>
            <span style={styles.strong}>What formats do I get?</span>
            <br />
            Both PDF and Microsoft Word (.docx)
          </Text>
          <Text style={styles.cardTextInfo}>
            <span style={styles.strong}>How long do download links last?</span>
            <br />
            7 days from completion
          </Text>
          <Text style={styles.cardTextInfo}>
            <span style={styles.strong}>Can I use this for my actual thesis?</span>
            <br />
            Check your institution's AI policy. We recommend using it as a research aid and starting point.
          </Text>
        </div>

        <Text style={styles.text} className="email-text">
          Questions? Reply to this email or check our{' '}
          <a href="https://opendraft.xyz/#faq" style={styles.link}>
            FAQ
          </a>
          .
        </Text>

        {/* Footer */}
        <div style={styles.footerWrapper}>
          <Text style={styles.footer} className="email-text-subtle">
            Thanks,
            <br />
            OpenDraft Team
          </Text>
          <Text style={styles.copyright} className="email-text-subtle">
            © 2025 OpenDraft ·{' '}
            <a href="https://opendraft.xyz" style={styles.link}>
              opendraft.xyz
            </a>
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail;
