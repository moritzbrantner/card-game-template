export async function GET(request: Request) {
  const target = new URL('/api/examples/employees', request.url);
  return Response.redirect(target, 308);
}
