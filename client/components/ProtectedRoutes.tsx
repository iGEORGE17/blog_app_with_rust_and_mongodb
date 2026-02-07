"use client"

import { useAuth } from "@/contexts/auth"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { Center, Spinner, VStack, Text } from "@chakra-ui/react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If loading is finished and there is no user, kick them to home
    if (!isLoading && !user) {
      router.push(`/?callbackUrl=${encodeURIComponent(pathname)}`)
    }
  }, [user, isLoading, router, pathname])

  // Show a loading state while checking the session
  if (isLoading) {
    return (
      <Center h="100vh">
        <VStack gap="4">
          <Spinner size="xl" color="blue.500" borderWidth="4px" />
          <Text fontWeight="medium" color="fg.muted">Securing session...</Text>
        </VStack>
      </Center>
    )
  }

  // Only render children if user is authenticated
  return user ? <>{children}</> : null
}