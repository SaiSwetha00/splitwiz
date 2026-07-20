export type PaymentCard = {
  id: string;
  user_id: string;
  card_type: string | null;
  last_4_digits: string | null;
  card_holder_name: string;
  bank_name: string | null;
  card_color: string;
  is_default: boolean;
  upi_id: string | null;
  created_at: string;
};

export const CARD_GRADIENTS: Record<string, { from: string; to: string; name: string }> = {
  '#1a1a2e': { from: '#1a1a2e', to: '#16213e', name: 'Blue' },
  '#4a0080': { from: '#4a0080', to: '#7b2ff7', name: 'Purple' },
  '#004d1a': { from: '#004d1a', to: '#00a651', name: 'Green' },
  '#7d5a00': { from: '#7d5a00', to: '#ffd700', name: 'Gold' },
  '#6b0000': { from: '#6b0000', to: '#cc0000', name: 'Red' },
  '#1a1a1a': { from: '#1a1a1a', to: '#333333', name: 'Dark' },
};
