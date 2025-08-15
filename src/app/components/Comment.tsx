export interface Comment {
  _id: string;
  user: { username: string };
  content: string;
  createdAt: string;
}