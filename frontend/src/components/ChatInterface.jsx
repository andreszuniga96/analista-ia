// src/components/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Icon,
  Flex,
  Spinner,
  Divider,
  useToast,
  Tooltip,
} from '@chakra-ui/react';
import { FiSend, FiUser, FiCpu, FiCopy } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);

function ChatInterface({ filename, onError, chatHistory, onUpdateHistory }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const chatEndRef = useRef(null);

  useEffect(() => {
    const handleKeywordEvent = (e) => {
      const keyword = e.detail;
      setQuestion('');
      handleSend(keyword);
    };
    window.addEventListener('keyword-question', handleKeywordEvent);
    return () => window.removeEventListener('keyword-question', handleKeywordEvent);
  }, [filename]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (filename) {
      const welcomeMessage = {
        sender: 'ai',
        text: `🧠 Documento cargado: "${filename}". Puedes comenzar a hacer preguntas sobre su contenido.`,
        page: null,
        citation: null,
        isWelcome: true,
      };
      const existing = chatHistory || [];
      setMessages([welcomeMessage, ...existing]);
    }
  }, [filename, chatHistory]);

  const handleSend = async (customQuestion) => {
    const q = customQuestion || question;
    if (!q.trim()) return;

    const userMessage = { sender: 'user', text: q };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/query-document/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, question: q }),
      });

      const data = await response.json();
      const answer = data.answer?.trim();

      const aiMessage = {
        sender: 'ai',
        text: answer || "No pude generar una respuesta útil para esa pregunta. Intenta reformularla.",
        page: data.page,
        citation: data.citation,
      };

      const newMessages = [userMessage, aiMessage];
      setMessages((prev) => [...prev, aiMessage]);
      onUpdateHistory(filename, [...chatHistory, ...newMessages]);
      setQuestion('');
    } catch (err) {
      onError('Error al consultar el documento.');
    } finally {
      setLoading(false);
    }
  };
  const handleCopyCitation = async (citation) => {
    try {
      await navigator.clipboard.writeText(citation);
      toast({
        title: 'Cita copiada al portapapeles',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch {
      toast({
        title: 'No se pudo copiar la cita',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getResponseColor = (text) => {
    if (!text || typeof text !== 'string') return 'gray.700';
    const lower = text.toLowerCase();
    if (lower.includes('concepto') || lower.includes('definición')) {
      return 'teal.700';
    }
    if (lower.includes('ejemplo') || lower.includes('código') || lower.includes('función')) {
      return 'blue.700';
    }
    return 'gray.700';
  };

  return (
    <Flex direction="column" w="100%" h="100%">
      <VStack spacing={3} align="stretch" flex="1" overflowY="auto" pb={4}>
        {messages.map((msg, idx) => (
          <MotionBox
            key={idx}
            initial={{ opacity: 0, y: msg.isWelcome ? -20 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: msg.isWelcome ? 0.6 : 0.3 }}
            bg={msg.sender === 'ai' ? getResponseColor(msg.text) : 'blue.700'}
            p={3}
            borderRadius="md"
            alignSelf={msg.sender === 'ai' ? 'flex-start' : 'flex-end'}
            maxW="100%"
            wordBreak="break-word"
          >
            <Flex align="center" gap={2}>
              <Icon as={msg.sender === 'ai' ? FiCpu : FiUser} />
              <Text>{msg.text}</Text>
            </Flex>

            {msg.page && (
              <Text fontSize="sm" mt={2} color="gray.400">
                Página relacionada: {msg.page}
              </Text>
            )}

            {msg.citation && (
              <>
                <Divider my={2} borderColor="gray.600" />
                <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
                  <Box
                    bg="gray.600"
                    p={2}
                    borderRadius="md"
                    fontSize="xs"
                    fontStyle="italic"
                    color="white"
                    shadow="sm"
                    flex="1"
                  >
                    {msg.citation}
                  </Box>
                  <Tooltip label="Copiar cita APA" hasArrow>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="cyan"
                      onClick={() => handleCopyCitation(msg.citation)}
                    >
                      <Icon as={FiCopy} />
                    </Button>
                  </Tooltip>
                </Flex>
              </>
            )}
          </MotionBox>
        ))}

        <AnimatePresence>
          {loading && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Box alignSelf="flex-start" p={3}>
                <Flex align="center" gap={2}>
                  <Spinner size="sm" color="cyan.300" />
                  <Text fontStyle="italic" color="gray.300">
                    Escribiendo...
                  </Text>
                </Flex>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={chatEndRef} />
      </VStack>

      <Flex mt={2} gap={2}>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Escribe tu pregunta..."
          bg="gray.700"
          color="white"
          borderColor="gray.600"
        />
        <Button onClick={() => handleSend()} colorScheme="cyan" isDisabled={loading}>
          <Icon as={FiSend} />
        </Button>
      </Flex>
    </Flex>
  );
}

export default ChatInterface;
