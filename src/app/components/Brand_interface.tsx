export interface Brand {
  _id: string;
  name: string;
  status: 'show' | 'hidden';
  logoImg: string;
}