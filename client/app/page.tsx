"use client"
import { useQuery } from "@tanstack/react-query";
import { fetchPosts, Post } from "@/hooks/posts";
import { Box, Container, Skeleton, SimpleGrid } from "@chakra-ui/react";
import { BlogPostCard } from "@/components/BlogPostCard";

export default function Home() {
const { data: posts, isLoading } = useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  })

  if (isLoading) {
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} height="200px" />)}
      </SimpleGrid>
    )
  }

  return (
    <Container maxW="5xl" py="10">
      <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
        {posts?.map((post: any) => (
          <BlogPostCard key={post._id.$oid} post={post} />
        ))}
      </SimpleGrid>
    </Container>
  )
}
