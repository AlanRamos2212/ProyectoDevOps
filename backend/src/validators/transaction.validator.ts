import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export type TransactionInput = {
  type: 'income' | 'expense';
  amountCents: number;
  category: string;
  description?: string;
  date: string;
};

const transactionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'amountCents', 'category', 'date'],
  properties: {
    type: { enum: ['income', 'expense'] },
    amountCents: { type: 'integer', minimum: 1 },
    category: { type: 'string', minLength: 1, maxLength: 60 },
    description: { type: 'string', maxLength: 250 },
    date: { type: 'string', format: 'date' }
  }
} as const;

export const validateTransaction = ajv.compile(transactionSchema);
