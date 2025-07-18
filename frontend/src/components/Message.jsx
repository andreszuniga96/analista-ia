// src/components/Message.jsx

import React from 'react';
import { motion } from 'framer-motion';
// LÍNEAS CORRECTAS
import { Box, Text, Icon, VStack, Button, useDisclosure } from '@chakra-ui/react';
import { Collapse } from '@chakra-ui/transition';
import { FiCpu, FiUser, FiMaximize2 } from 'react-icons/fi';

const glassmorphicStyle = {
  bg: 'rgba(45, 55, 72, 0.55)',
  backdropFilter: 'blur(12px)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderWidth: '1px',
  borderRadius: 'lg',
  p: 4,
  shadow: 'md',
};

function Message({ message }) {
  const isAI = message.sender === 'ai';
  const { isOpen, onToggle } = useDisclosure();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        alignSelf: isAI ? 'flex-start' : 'flex-end',
        width: '85%',
        maxWidth: '700px',
      }}
    >
      <VStack
        sx={glassmorphicStyle}
        align={isAI ? 'start' : 'end'}
        spacing={3}
        bg={isAI ? 'rgba(45, 55, 72, 0.7)' : 'rgba(0, 150, 255, 0.15)'}
        borderColor={isAI ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 150, 255, 0.3)'}
      >
        <Box display="flex" alignItems="center" gap={3}>
          <Icon as={isAI ? FiCpu : FiUser} boxSize={5} color={isAI ? "cyan.300" : "blue.300"} />
          <Text whiteSpace="pre-wrap" lineHeight="tall">
            {message.text}
          </Text>
        </Box>

        {isAI && message.context && (
          <>
            <Button
              size="xs"
              variant="outline"
              colorScheme="cyan"
              onClick={onToggle}
              leftIcon={<FiMaximize2 />}
            >
              Mostrar Contexto Usado
            </Button>
            <Collapse in={isOpen} animateOpacity>
              <Box
                mt={4}
                p={3}
                bg="rgba(0,0,0,0.3)"
                borderRadius="md"
                borderLeft="3px solid"
                borderColor="cyan.500"
              >
                <Text fontSize="sm" color="gray.300" fontStyle="italic" whiteSpace="pre-wrap">
                  {message.context}
                </Text>
              </Box>
            </Collapse>
          </>
        )}
      </VStack>
    </motion.div>
  );
}

export default Message;