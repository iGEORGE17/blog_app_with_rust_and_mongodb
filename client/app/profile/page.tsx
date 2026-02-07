import { Box, Container, Text } from '@chakra-ui/react'
import React from 'react'

export default function Profile() {
  return (
    <Box as={"section"}>
        <Container maxW="5xl" py="10">
        <Text fontSize="2xl" fontWeight="bold">Profile</Text>
        </Container>
        </Box>
  )
}
