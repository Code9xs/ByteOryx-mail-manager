export type MailboxImportRecord = {
  email: string;
  password: string;
  clientId: string;
  refreshToken: string;
};

export type MailboxImportError = {
  line: number;
  message: string;
};

export type MailboxImportResult = {
  records: MailboxImportRecord[];
  errors: MailboxImportError[];
};

const DEFAULT_DELIMITER = "----";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseMailboxImport(
  text: string,
  delimiter = DEFAULT_DELIMITER
): MailboxImportResult {
  const records: MailboxImportRecord[] = [];
  const errors: MailboxImportError[] = [];

  text
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter(({ line }) => line.length > 0)
    .forEach(({ line, number }) => {
      const fields = line.split(delimiter).map((field) => field.trim());

      if (fields.length !== 4) {
        errors.push({
          line: number,
          message: `Expected 4 fields but found ${fields.length}`
        });
        return;
      }

      const [email, password, clientId, refreshToken] = fields;
      if (!email || !EMAIL_PATTERN.test(email)) {
        errors.push({ line: number, message: "Invalid email address" });
        return;
      }

      if (!password || !clientId || !refreshToken) {
        errors.push({ line: number, message: "Fields cannot be empty" });
        return;
      }

      records.push({ email, password, clientId, refreshToken });
    });

  return { records, errors };
}
