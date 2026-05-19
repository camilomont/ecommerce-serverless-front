export interface User {
  userId: string;
  name: string;
  email: string;
}

export interface Product {
  productId: string;
  name: string;
  price: number;
}

export interface Purchase {
  userId: string;
  productId: string;
  quantity: number;
  purchaseDate: string;
}

export interface ListResponse<T> {
  items: T[];
  lastEvaluatedKey: unknown | null;
}

export interface ApiMessage {
  message: string;
}
