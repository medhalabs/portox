export type MutualFund = {
  id: string;
  user_id: string;
  scheme_code: string;
  scheme_name: string;
  units: number;
  nav: number;
  investment_date: string;
  fees: number;
};

export type MutualFundScheme = {
  scheme_code: string;
  scheme_name: string;
  amc?: string;
  fund_type?: string;
};

