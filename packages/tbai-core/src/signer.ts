import { createHash, createSign, generateKeyPairSync } from 'crypto';

// Generate an ephemeral RSA key pair for testing purposes.
// In production this would load a real X.509 certificate + private key.
let _keyPair: ReturnType<typeof generateKeyPairSync> | null = null;

function getKeyPair() {
  if (!_keyPair) {
    _keyPair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
  }
  return _keyPair;
}

function buildSignedInfoCanonical(digestValue: string, referenceUri: string): string {
  return `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
    `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
    `<ds:Reference URI="${referenceUri}">` +
      `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
      `<ds:DigestValue>${digestValue}</ds:DigestValue>` +
    `</ds:Reference>` +
    `</ds:SignedInfo>`;
}

export function signXml(xml: string): string {
  const { privateKey, publicKey } = getKeyPair();

  // Compute digest of the document
  const digestValue = createHash('sha256').update(xml, 'utf8').digest('base64');

  // Sign the SignedInfo element
  const signedInfoCanon = buildSignedInfoCanonical(digestValue, '#documento');
  const signer = createSign('RSA-SHA256');
  signer.update(signedInfoCanon);
  const signatureValue = signer.sign(privateKey as string, 'base64');

  // Extract public key modulus for KeyInfo (simplified — real XAdES needs full cert)
  const pubKeyPem = (publicKey as string)
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\n/g, '');

  const signatureBlock = `
  <ds:Signature Id="Signature" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
    ${buildSignedInfoCanonical(digestValue, '#documento')}
    <ds:SignatureValue Id="SignatureValue">
      ${signatureValue}
    </ds:SignatureValue>
    <ds:KeyInfo>
      <ds:X509Data>
        <ds:X509SubjectName>CN=TestHarness,O=TestOrg,C=ES</ds:X509SubjectName>
        <ds:X509Certificate>${pubKeyPem}</ds:X509Certificate>
      </ds:X509Data>
    </ds:KeyInfo>
  </ds:Signature>`;

  // Inject Signature before closing root tag
  return xml.replace(
    /(<\/T:TicketBai>)\s*$/,
    `${signatureBlock}\n</T:TicketBai>`,
  );
}
