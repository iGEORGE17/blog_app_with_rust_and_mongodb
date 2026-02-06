"use client"

import React from "react"
import NextLink from "next/link"
import { 
  Box, 
  Container, 
  Flex, 
  HStack, 
  Text, 
  Link, 
  Button, 
  SkeletonCircle,
  Avatar,
  Menu,
} from "@chakra-ui/react"

import { ColorModeButton } from "@/components/ui/color-mode"
import { useAuth } from "@/contexts/auth" // Ensure this path is correct
import { AuthModal } from "./AuthModal"
import { LuUser, LuSettings, LuBookmark, LuLogOut } from "react-icons/lu"

// 1. Updated UserMenu to receive the logout function
function UserMenu({ user, onLogout }: { user: any, onLogout: () => void }) {
  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <Button variant="ghost" rounded="full" p="0" size="sm">
          <Avatar.Root size={"md"}>
            {/* Safe check for username */}
            <Avatar.Fallback>{(user?.username || "U").charAt(0).toUpperCase()}</Avatar.Fallback>
            {user?.image && <Avatar.Image src={user.image} alt={user.username} />}
          </Avatar.Root>
        </Button>
      </Menu.Trigger>
      
      <Menu.Content zIndex="popover" position={"absolute"} top="60px" right={"0px"}  maxWidth="md" rounded="md" shadow="lg">
        <Box px="3" py="2" borderBottomWidth="1px" borderColor="border.subtle">
          <Text fontWeight="bold" fontSize="sm">{user?.username}</Text>
          <Text fontSize="xs" color="fg.muted" truncate>{user?.email}</Text>
        </Box>      
        
        <Menu.Item value="profile" cursor="pointer">
          <HStack gap="2"><LuUser size={16} /> Profile</HStack>
        </Menu.Item>
        <Menu.Item value="bookmarks" cursor="pointer">
          <HStack gap="2"><LuBookmark size={16} /> Reading List</HStack>
        </Menu.Item>
        <Menu.Item value="settings" cursor="pointer" borderBottomWidth="1px" borderColor="border.subtle">
          <HStack gap="2"><LuSettings size={16} /> Settings</HStack>
        </Menu.Item>
        
        <Menu.Item 
          value="logout" 
          color="fg.error" 
          _hover={{ bg: "bg.error/10" }} 
          cursor="pointer"
          onClick={onLogout} // Trigger the logout from context
        >
          <HStack gap="2"><LuLogOut size={16} /> Sign Out</HStack>
        </Menu.Item>
      </Menu.Content>
    </Menu.Root>
  )
}

export const Navbar = () => {
  // 2. Use the central Auth Context instead of a local useQuery
  const { user, isLoading, logout } = useAuth()

  return (
    <Box 
      as="nav" 
      position="sticky"
      top="0"
      zIndex="sticky" 
      bg="bg.panel/80" 
      backdropFilter="blur(10px)"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      width="full"
    >
      <Container maxW="5xl" py={3}>
        <Flex justify="space-between" align="center">
          <Link asChild variant="plain" _hover={{ textDecoration: "none" }}>
            <NextLink href="/">
              <Text fontSize="2xl" fontWeight="black" letterSpacing="tighter">
                RUSTO<Text as="span" color="blue.500">.</Text>
              </Text>
            </NextLink>
          </Link>

          <HStack gap={6}>
            <HStack gap={6} display={{ base: "none", md: "flex" }}>
              <Link asChild fontSize="sm" fontWeight="medium" color="fg.muted" _hover={{ color: "fg.default" }}>
                <NextLink href="/posts">Articles</NextLink>
              </Link>
            </HStack>

            <HStack gap={4}>
              <ColorModeButton />

              {isLoading ? (
                <SkeletonCircle size="8" />
              ) : user ? (
                <UserMenu user={user} onLogout={logout} />
              ) : (
                <AuthModal />
              )}
            </HStack>
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}