import { NodeXadesSigner } from "../src/signer.js";
import { NodeXadesVerifier } from "../src/verifier.js";
import fs from "fs";

test("sign + verify", async () => {
  const signer = new NodeXadesSigner();
  const verifier = new NodeXadesVerifier();
  const xml = `<TicketBai><Test>123</Test></TicketBai>`;
  const cert = {
    p12: fs.readFileSync("./test-cert.p12"),
    password: "password",
  };
  const signed = await signer.sign(xml, cert);
  const result = await verifier.verify(signed.xml);
  expect(result.valid).toBe(true);
});
