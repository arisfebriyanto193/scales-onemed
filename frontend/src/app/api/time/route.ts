import { NextResponse } from 'next/server';

export async function GET() {
  // Mengembalikan waktu server saat ini (dalam milidetik)
  return NextResponse.json({
    time: new Date().getTime()
  });
}
