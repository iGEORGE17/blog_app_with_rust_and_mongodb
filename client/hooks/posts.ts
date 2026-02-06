import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";


const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type Post = {
  id: string;
  title: string;
  content: string;
  author: string;
  // Add other fields as needed
};

export async function fetchPosts(): Promise<Post[]> {
  const res = await fetch(`${API_BASE}/posts`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}