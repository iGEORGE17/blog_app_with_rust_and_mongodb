"use client"

import { useAuth } from "@/contexts/auth"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Container, Heading, SimpleGrid, Card, Text, 
  Button, HStack, Badge, Box, Spinner
} from "@chakra-ui/react"
import { LuTrash2,  LuPlus } from "react-icons/lu"
import NextLink from "next/link"
import { toaster } from "@/components/ui/toaster"
import { RiFileEditFill } from "react-icons/ri";


export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  // 1. Fetch only the current user's posts
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["my-posts", user?.id],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts/me`, {
        headers: { Authorization: `Bearer ${user?.accessToken}` }
      })
      if (!res.ok) throw new Error("Could not fetch your posts")

      return res.json()
    },
    enabled: !!user?.accessToken // Only fetch if we have a token
  })

  console.log(posts)

  // 2. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user?.accessToken}` }
      })
      if (!res.ok) throw new Error("Failed to delete")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-posts"] })
      toaster.create({ title: "Post removed", type: "success" })
    },
    onError: (err: any) => {
      toaster.create({ title: err.message, type: "error" })
    }
  })


  // 3. Update Mutation (optional, for edit functionality)
   const updateMutation = useMutation({
    mutationFn: async ({ postId, data }: { postId: string, data: any }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts/${postId}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.accessToken}` 
        },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error("Failed to update")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-posts"] })
      toaster.create({ title: "Post updated", type: "success" })
    },
    onError: (err: any) => {
      toaster.create({ title: err.message, type: "error" })
    }
  })

  if (authLoading || postsLoading) return <Spinner size="xl" mt="10" />
  if (!isAuthenticated) return <Text mt="10" textAlign="center">Please login to view dashboard.</Text>

  return (
    <Container maxW="5xl" py="10">
      <HStack justify="space-between" mb="8">
        <Box>
          <Heading size="2xl" letterSpacing="tight">Dashboard</Heading>
          <Text color="fg.muted">Manage your stories and drafts</Text>
        </Box>
        <Button asChild colorPalette="blue">
          <NextLink href="/posts/new">
            <LuPlus /> New Post
          </NextLink>
        </Button>
      </HStack>

      {posts?.length === 0 ? (
        <Box textAlign="center" py="20" borderWidth="1px" borderStyle="dashed" rounded="xl">
          <Text color="fg.muted" mb="4">You haven't written anything yet.</Text>
          <Button variant="outline" asChild><NextLink href="/posts/new">Start Writing</NextLink></Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
          {posts?.map((post: any) => (
            
            <Card.Root key={post._id?.$oid} variant="outline" size="sm">
              <Card.Body gap="2">
                <Badge variant="subtle" alignSelf="flex-start" colorPalette="blue">Published</Badge>
                <Card.Title mt="2">{post.title}</Card.Title>
                <Card.Description lineClamp={2}>
                  {post.content}
                </Card.Description>
              </Card.Body>
              <Card.Footer borderTopWidth="1px" pt="3">
                <HStack justify="flex-end" width="full">
                  <Button variant="ghost" size="sm" gap="2" onClick={() => updateMutation.mutate({ postId: post._id?.$oid, data: { title: post.title, content: post.content } })}>
                    <RiFileEditFill /> Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    colorPalette="red" 
                    size="sm" 
                    gap="2"
                    loading={deleteMutation.isPending}
                    onClick={() => {
                      if(confirm("Are you sure?")) deleteMutation.mutate(post._id?.$oid)
                    }}
                  >
                    <LuTrash2 /> Delete
                  </Button>
                </HStack>
              </Card.Footer>
            </Card.Root>
          ))}
        </SimpleGrid>
      )}
    </Container>
  )
}