import * as React from "react";
import {
  Body,
  Container,
  Head,
  Img,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Button,
  Hr,
} from "@react-email/components";

interface ShareLinkEmailProps {
  shareUrl: string;
  senderName: string;
  recipientName?: string;
  message?: string;
}

export const ShareLinkEmail: React.FC<ShareLinkEmailProps> = ({
  shareUrl,
  senderName = "Your Friend",
  recipientName = "there",
  message = "",
}) => {
  const previewText = `A surprise is waiting for you.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={imageContainer}>
            <Img
              src="https://unwrap.love/gift.png"
              width="120"
              height="120"
              alt="Gift"
              style={logo}
            />
          </Section>

          <Text style={subject}>Unwrap Your Gift</Text>

          <Text style={paragraph}>Hi {recipientName},</Text>

          <Text style={paragraph}>
            I made a special{" "}
            <Link href={shareUrl} style={giftLink}>gift</Link> for you, please click the button below to open it.
          </Text>

          {message && (
            <Section style={messageBox}>
              <Text style={messageText}>{message}</Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button href={shareUrl} style={button}>
              Unwrap It
            </Button>
          </Section>

          <Hr style={divider} />

          <Text style={footer}>powered by unwrap.love</Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: "20px 0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e6ebf1",
  borderRadius: "16px",
  margin: "0 auto",
  padding: "40px",
  maxWidth: "600px",
};

const imageContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const logo = {
  margin: "0 auto",
};

const subject = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  marginBottom: "24px",
  textAlign: "center" as const,
};

const paragraph = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  marginBottom: "16px",
};

const messageBox = {
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "24px",
};

const messageText = {
  color: "#525f7f",
  fontSize: "16px",
  fontStyle: "italic",
  lineHeight: "24px",
  margin: "0",
};

const giftLink = {
  color: "#4f46e5",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginBottom: "40px",
  marginTop: "40px",
};

const button = {
  backgroundColor: "#000000",
  borderRadius: "12px",
  color: "#fff",
  display: "inline-block",
  fontSize: "16px",
  padding: "12px 24px",
  textDecoration: "none",
  textAlign: "center" as const,
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  marginTop: "32px",
  textAlign: "center" as const,
};

const divider = {
  borderTop: "1px solid #e6ebf1",
  margin: "0 auto",
  width: "100%",
};

export default ShareLinkEmail;
