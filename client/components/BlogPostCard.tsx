"use client"

import { 
  Card, Text, Badge, Heading, Stack, HStack, Avatar, Icon, 
  Group, IconButton, 
  Flex
} from "@chakra-ui/react"
import { 
  LuCalendar, LuHeart, LuMessageSquare, LuBookmark, LuShare2 
} from "react-icons/lu"

// Extended Props for dummy data
interface BlogPostProps {
  post: {
    _id: { $oid: string }
    title: string
    content: string
    author_name: string
    created_at: { $date: { $numberLong: string } }
    // Dummy fields we'll add
    stats?: {
      likes: number
      comments: number
    }
  }
}

export const BlogPostCard = ({ post }: BlogPostProps) => {
  const date = new Date(parseInt(post.created_at.$date.$numberLong))
  const formattedDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  // Dummy stats if not provided by your API yet
  const stats = post.stats || { likes: 124, comments: 18 }

  return (
    <Card.Root width="full" variant="outline" overflow="hidden" _hover={{ shadow: "md", transition: "all 0.2s" }}>
      <Card.Body gap="3">
        <HStack justify="space-between">
          <Badge variant="subtle" colorPalette="blue">Rust</Badge>
          <HStack gap="1" color="fg.muted">
            <Icon size="xs"><LuCalendar /></Icon>
            <Text fontSize="xs">{formattedDate}</Text>
          </HStack>
        </HStack>
        
        <Stack gap="1">
          <Card.Header mt="2" px={0}>
            <Heading size="md" letterSpacing="tight">{post.title}</Heading>
          </Card.Header>
            <Text lineClamp={3} color="fg.subtle">{post.content}</Text>
        </Stack>
      </Card.Body>

      {/* Interactive Footer */}
      <Card.Footer borderTopWidth="1px" borderColor="border.subtle" py="2" px="4">
        <Flex justify="space-between" align="center" width="full">
          {/* Left Side: Author */}
          <HStack gap="2">
            <Avatar.Root size="xs">
              <Avatar.Fallback name={post.author_name} />
            </Avatar.Root>
            <Text fontSize="xs" fontWeight="bold">{post.author_name}</Text>
          </HStack>

          {/* Right Side: Interaction Group */}
          <Group attached>
            <HStack gap="3">
              <HStack gap="1" cursor="pointer" _hover={{ color: "red.500" }}>
                <Icon size="sm"><LuHeart /></Icon>
                <Text fontSize="xs">{stats.likes}</Text>
              </HStack>
              
              <HStack gap="1" cursor="pointer" _hover={{ color: "blue.500" }}>
                <Icon size="sm"><LuMessageSquare /></Icon>
                <Text fontSize="xs">{stats.comments}</Text>
              </HStack>

              <IconButton aria-label="Save to bookmarks" variant="ghost" size="xs">
                <LuBookmark />
              </IconButton>
              
              <IconButton aria-label="Share post" variant="ghost" size="xs">
                <LuShare2 />
              </IconButton>
            </HStack>
          </Group>
        </Flex>
      </Card.Footer>
    </Card.Root>
  )
}