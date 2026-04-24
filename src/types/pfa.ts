export interface PfaTxn {
  id: string;
  date: string;
  month: string;
  type: string;
  payee: string;
  memo: string;
  amount: number;
  isCredit: boolean;
  account: string;
  accountShort: string;
  category: string | null;
  isTransfer: boolean;
  preFlagCategory?: string | null;
}

export interface PfaCategory {
  name: string;
  color: string;
}

export type PfaBudgets = Record<string, number>;

export type PfaMerchantMap = Record<string, string>;

export type PfaAccountAliases = Record<string, string>;
