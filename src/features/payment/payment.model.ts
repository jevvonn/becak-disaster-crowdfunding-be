export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  custom_field1?: string;
  [key: string]: unknown;
}

export interface NotificationResult {
  order_id: string;
  status: string;
}
