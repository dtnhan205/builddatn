import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ message: 'No token provided' }, { status: 400 });
  }

  // Tạo response và đặt cookie
  const response = NextResponse.redirect(new URL('/user', req.url));
  response.cookies.set('token', token, {
    httpOnly: true, // Cookie chỉ truy cập được từ server
    maxAge: 3600,   // Thời gian sống 1 giờ (3600 giây)
    path: '/',      // Áp dụng cho toàn bộ ứng dụng
    secure: process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS ở production
  });

  return response;
}