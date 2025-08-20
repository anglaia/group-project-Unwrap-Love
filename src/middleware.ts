import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 定义公开路由
const publicRoutes = ['/', '/api', '/paper', '/moodboard'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 检查是否是公开路由
  const isPublicRoute = publicRoutes.some(route =>
    path === route || path.startsWith(`${route}/`)
  );

  // 目前简单实现，允许所有访问
  // 注意：Firebase认证通常在客户端进行检查，而不是在中间件
  // 如果需要服务器端路由保护，可以考虑使用会话Cookie或其他方法
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 