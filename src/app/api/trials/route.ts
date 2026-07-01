import { NextResponse } from "next/server";
import { getTrials } from "@/lib/trials";

export async function GET() {
  const trials = getTrials();
  return NextResponse.json(trials);
}
