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
  Circle,
  Menu
} from "@chakra-ui/react"

import { ColorModeButton } from "@/components/ui/color-mode"
import { AuthModal } from "./AuthModal"
import { LuLogOut, LuLayoutDashboard, LuSettings, LuSquarePen } from "react-icons/lu"
import { useAuth } from "@/contexts/auth"

// 1. Destructure props here: { user, logout }
export const UserMenu = ({ user, logout }: { user: any; logout: any }) => {
  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <Button variant="ghost" shape="circle" size="sm" p="0">
          <Circle size="32px" bg="blue.500" color="white" fontWeight="bold">
            {/* Safe check with optional chaining */}
            {user?.username?.charAt(0).toUpperCase()}
          </Circle>
        </Button>
      </Menu.Trigger>

      <Menu.Positioner>
        <Menu.Content minW="200px" borderRadius="lg" p="1" shadow="md">
          <Box px="3" py="2" borderBottomWidth="1px" borderColor="border.subtle">
            <Text fontWeight="semibold" fontSize="sm">{user?.email}</Text>
            <Text fontSize="xs" color="fg.muted">{user?.username}</Text>
          </Box>

          <Menu.ItemGroup title="Account">
            <Menu.Item value="dashboard" cursor="pointer" asChild>
              <NextLink href="/dashboard">
                <LuLayoutDashboard />
                <Box flex="1">Dashboard</Box>
              </NextLink>
            </Menu.Item>
            
            <Menu.Item value="settings" cursor="pointer">
              <LuSettings />
              <Box flex="1">Settings</Box>
            </Menu.Item>
          </Menu.ItemGroup>

          <Menu.Separator />

          <Menu.Item 
            value="logout" 
            onClick={logout}
            color="red.500"
            _hover={{ bg: "red.50", color: "red.600" }}
            cursor="pointer"
          >
            <LuLogOut />
            <Box flex="1">Sign Out</Box>
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}

export const Navbar = () => {
  const { user, isLoading, isAuthenticated, logout } = useAuth()

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

          <HStack gap={4}>
            <ColorModeButton />

            {isLoading ? (
              <SkeletonCircle size="8" />
            ) : isAuthenticated ? (
              <>
                <Button 
                  asChild 
                  variant="ghost" 
                  size="sm" 
                  display={{ base: "none", sm: "flex" }}
                  gap="2"
                >
                  <NextLink href="/posts/new">
                    <LuSquarePen size={16} />
                    Write
                  </NextLink>
                </Button>
                {/* Ensure the prop names match: user and logout */}
                <UserMenu user={user} logout={logout} />
              </>
            ) : (
              <AuthModal />
            )}
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}