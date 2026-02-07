"use client"

import { useEffect, useState } from "react"
import { 
  Box, Button, Container, Heading, Input, Stack, Textarea, 
  VStack, Field, HStack, IconButton, Text,
  Spinner
} from "@chakra-ui/react"
import { useAuth } from "@/contexts/auth"
import { toaster } from "@/components/ui/toaster"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"

// Icons
import { FaFeatherPointed, FaRegImage } from "react-icons/fa6"
import { MdOutlinePublish, MdClose } from "react-icons/md"
import { IoDocumentTextOutline } from "react-icons/io5"

export default function CreatePostForm() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({ title: "", content: "" })

  // --- TanStack Mutation ---
  const mutation = useMutation({
    mutationFn: async (newPost: typeof formData) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.accessToken}`, 
        },
        body: JSON.stringify(newPost),
      })
      if (!res.ok) throw new Error("Server refused the post")
      return res.json()
    },
    onSuccess: () => {
      // This tells TanStack to refresh any 'posts' list you have elsewhere
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      toaster.create({ title: "Post published!", type: "success" })
      router.push("/")
    },
onError: (error: any) => {
      toaster.create({ title: "Error", description: error.message, type: "error" })
    }
  })

const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.content) return
    mutation.mutate(formData)
  }

  return (
    <Container maxW="3xl" py="12">
      <VStack gap="10" align="stretch">
        <HStack justify="space-between">
          <HStack gap="3">
            <Box color="blue.500"><FaFeatherPointed size="28px" /></Box>
            <Heading size="2xl">New Story</Heading>
          </HStack>
          <IconButton variant="ghost" rounded="full" onClick={() => router.back()}>
            <MdClose size="24px" />
          </IconButton>
        </HStack>

        <form onSubmit={handleSubmit}>
          <Stack gap="8">
            <Field.Root>
              <Input 
                placeholder="Title" 
                variant="flushed"
                fontSize="4xl"
                fontWeight="black"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Field.Root>

            <Field.Root>
              <HStack mb="2" color="fg.muted">
                <IoDocumentTextOutline />
                <Text fontSize="sm" fontWeight="bold">STORY CONTENT</Text>
              </HStack>
              <Textarea 
                placeholder="Write your heart out..." 
                variant="subtle"
                minH="400px"
                fontSize="xl"
                p="6"
                rounded="2xl"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </Field.Root>

            <HStack justify="space-between" pt="6" borderTop="1px solid" borderColor="border.subtle">
              <Button variant="outline" rounded="full">
                <FaRegImage /> Add Header Image
              </Button>
              
              <Button 
                type="submit" 
                colorPalette="blue" 
                size="xl" 
                rounded="full" 
                loading={mutation.isPending} // Handled by TanStack
                px="10"
              >
                Publish Now <MdOutlinePublish size="22px" />
              </Button>
            </HStack>
          </Stack>
        </form>
      </VStack>
    </Container>
  )
}