// src/App.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Container, Heading, VStack, Text, Flex, Icon, Grid, GridItem,
  List, ListItem, Alert, AlertIcon, AlertTitle, AlertDescription,
  Button, HStack, Tag, Wrap, WrapItem, useToast, Stack, Tooltip
} from '@chakra-ui/react';
import { FiFileText, FiAlertTriangle, FiTrash2, FiPlayCircle, FiXCircle, FiCheckCircle } from 'react-icons/fi';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import ErrorBoundary from './components/ErrorBoundary';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);
const MotionDiv = motion.div;

function App() {
  const [uploadedFilename, setUploadedFilename] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [relatedQuestions, setRelatedQuestions] = useState([]);
  const [chatHistories, setChatHistories] = useState({});
  const [presentationMode, setPresentationMode] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [documentReady, setDocumentReady] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('analistaIA_state');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUploadedFilename(parsed.uploadedFilename || '');
      setHistory(parsed.history || []);
      setKeywords(parsed.keywords || []);
      setRelatedQuestions(parsed.relatedQuestions || []);
      setChatHistories(parsed.chatHistories || {});
      setDocumentReady(parsed.documentReady || false);
    }
  }, []);

  useEffect(() => {
    const state = {
      uploadedFilename,
      history,
      keywords,
      relatedQuestions,
      chatHistories,
      documentReady,
    };
    localStorage.setItem('analistaIA_state', JSON.stringify(state));
  }, [uploadedFilename, history, keywords, relatedQuestions, chatHistories, documentReady]);

  const handleUploadSuccess = async (filename, extractedKeywords, suggestedQuestions) => {
    setUploadedFilename(filename);
    setError('');
    setShowSuccess(true);
    setDocumentReady(false);

    setTimeout(() => {
      setShowSuccess(false);
      setDocumentReady(true);
    }, 1500);

    if (!history.includes(filename)) {
      setHistory((prev) => [...prev, filename]);
    }

    setKeywords(extractedKeywords);
    setRelatedQuestions(suggestedQuestions.slice(0, 5));

    setChatHistories((prev) => ({
      ...prev,
      [filename]: prev[filename] || [],
    }));
  };

  const handleSelectFromHistory = async (filename) => {
    setUploadedFilename(filename);
    setError('');
    setShowSuccess(false);
    setDocumentReady(false);

    try {
      const res = await fetch(`http://127.0.0.1:8000/preview/${filename}`);
      const data = await res.json();
      setKeywords(data.keywords);
      setRelatedQuestions(data.related_questions.slice(0, 5));
      setTimeout(() => setDocumentReady(true), 1000);
    } catch {
      setKeywords([]);
      setRelatedQuestions([]);
    }
  };

  const handleDeleteFromHistory = (filename) => {
    const updated = history.filter((f) => f !== filename);
    setHistory(updated);
    setChatHistories((prev) => {
      const copy = { ...prev };
      delete copy[filename];
      return copy;
    });
    if (uploadedFilename === filename) {
      setUploadedFilename('');
      setKeywords([]);
      setRelatedQuestions([]);
      setDocumentReady(false);
    }
    toast({
      title: 'Documento eliminado del historial.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleKeywordClick = (text) => {
    if (!documentReady) {
      toast({
        title: 'Espera un momento...',
        description: 'El documento aún se está preparando. Intenta en unos segundos.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    window.dispatchEvent(new CustomEvent('keyword-question', { detail: text }));
  };

  const togglePresentation = () => {
    setPresentationMode((prev) => !prev);
    setSlideIndex(0);
  };

  const getSlides = () => {
    const history = chatHistories[uploadedFilename] || [];
    const responses = history.filter((msg) => msg.sender === 'ai');
    return responses.map((msg) => {
      const sentences = msg.text.split('.').filter((s) => s.length > 40);
      return sentences.slice(0, 2).join('. ') + '.';
    });
  };
  return (
    <Box minH="100vh" p={4} bgGradient="linear(to-br, gray.900, gray.800, gray.900)" color="white">
      <Container maxW="container.xl" h="calc(100vh - 2rem)">
        <VStack spacing={4} h="100%">
          <Flex align="center" justify="center" gap={3}>
            <Icon as={FiFileText} boxSize={8} color="cyan.300" />
            <Heading as="h1" size="lg" fontWeight="bold">
              Analista de Documentos con IA
            </Heading>
          </Flex>

          {!uploadedFilename && (
            <Text fontSize="sm" color="gray.400" textAlign="center" mt={2}>
              📄 Sube un documento PDF para comenzar el análisis.
            </Text>
          )}

          {error && (
            <MotionBox
              bg="red.600"
              p={3}
              borderRadius="lg"
              w="100%"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Flex align="center" gap={3}>
                <Icon as={FiAlertTriangle} color="white" boxSize={5} />
                <Text fontWeight="bold">Error: {error}</Text>
              </Flex>
            </MotionBox>
          )}

          {documentReady && uploadedFilename && (
            <MotionBox
              bg="green.700"
              p={3}
              borderRadius="lg"
              w="100%"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Flex align="center" gap={3}>
                <Icon as={FiCheckCircle} color="white" boxSize={5} />
                <Text fontWeight="bold">Documento listo para preguntas</Text>
              </Flex>
            </MotionBox>
          )}

          <Grid templateColumns={{ base: '1fr', lg: '350px 1fr' }} gap={6} w="100%" flex="1">
            <GridItem overflowY="auto" maxH="calc(100vh - 200px)">
              <ErrorBoundary>
                <Heading size="sm" mb={2} textAlign="center">Cargar documento</Heading>
                <DocumentUpload onUploadSuccess={handleUploadSuccess} onError={setError} />
              </ErrorBoundary>

              {showSuccess && (
                <MotionBox
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  mt={4}
                >
                  <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    <AlertTitle>Documento cargado correctamente</AlertTitle>
                    <AlertDescription>{uploadedFilename}</AlertDescription>
                  </Alert>
                </MotionBox>
              )}

              {history.length > 0 && (
                <Box mt={4}>
                  <Heading size="sm" mb={2} textAlign="center">Historial de documentos</Heading>
                  <List spacing={2}>
                    {history.map((file, idx) => (
                      <ListItem key={idx}>
                        <HStack>
                          <Button
                            size="sm"
                            variant={file === uploadedFilename ? 'solid' : 'outline'}
                            colorScheme="cyan"
                            onClick={() => handleSelectFromHistory(file)}
                            maxW="200px"
                            overflow="hidden"
                            whiteSpace="nowrap"
                            textOverflow="ellipsis"
                          >
                            {file}
                          </Button>
                          <Icon
                            as={FiTrash2}
                            boxSize={4}
                            color="red.300"
                            cursor="pointer"
                            onClick={() => handleDeleteFromHistory(file)}
                          />
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {keywords.length > 0 && (
                <Box mt={4}>
                  <Heading size="sm" mb={2} textAlign="center">Palabras clave</Heading>
                  <Wrap justify="center">
                    {keywords.map((kw, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                      >
                        <WrapItem>
                          <Tag
                            size="md"
                            variant="solid"
                            colorScheme="cyan"
                            cursor="pointer"
                            onClick={() => handleKeywordClick(kw)}
                          >
                            {kw}
                          </Tag>
                        </WrapItem>
                      </motion.div>
                    ))}
                  </Wrap>
                </Box>
              )}

              {relatedQuestions.length > 0 && (
                <Box mt={4}>
                  <Heading size="sm" mb={2} textAlign="center">Preguntas sugeridas</Heading>
                  <Stack direction="column" spacing={3} mt={2}>
                    {relatedQuestions.map((q, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                      >
                        <Box p={2} bg="gray.700" borderRadius="md">
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="cyan"
                            onClick={() => handleKeywordClick(q)}
                            whiteSpace="normal"
                            textAlign="left"
                            w="100%"
                          >
                            {q}
                          </Button>
                        </Box>
                      </motion.div>
                    ))}
                  </Stack>
                </Box>
              )}

              {uploadedFilename && (
                <Box mt={6} textAlign="center">
                  <Button
                    leftIcon={presentationMode ? <FiXCircle /> : <FiPlayCircle />}
                    colorScheme="purple"
                    variant="solid"
                    onClick={togglePresentation}
                  >
                    {presentationMode ? 'Cerrar presentación' : 'Modo presentación'}
                  </Button>
                </Box>
              )}
            </GridItem>

            <GridItem>
              {uploadedFilename && !presentationMode && (
                <MotionDiv
                  key={uploadedFilename}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Box
                    bg="gray.800"
                    borderRadius="xl"
                    p={4}
                    shadow="xl"
                    overflow="hidden"
                    h="100%"
                  >
                    <ErrorBoundary>
                      <ChatInterface
                        filename={uploadedFilename}
                        onError={setError}
                        chatHistory={chatHistories[uploadedFilename] || []}
                        onUpdateHistory={(filename, updated) =>
                          setChatHistories((prev) => ({ ...prev, [filename]: updated }))
                        }
                      />
                    </ErrorBoundary>
                  </Box>
                </MotionDiv>
              )}

              {uploadedFilename && presentationMode && (
                <Box
                  bg="gray.900"
                  borderRadius="xl"
                  p={6}
                  shadow="xl"
                  h="100%"
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                  textAlign="center"
                >
                  <Heading size="md" mb={4}>📽️ Diapositiva {slideIndex + 1}</Heading>
                  <Text fontSize="lg" color="cyan.200" mb={6}>
                    {getSlides()[slideIndex] || 'No hay contenido aún.'}
                  </Text>
                  <HStack spacing={4}>
                    <Button
                      onClick={() => setSlideIndex((i) => Math.max(i - 1, 0))}
                      isDisabled={slideIndex === 0}
                      colorScheme="gray"
                      variant="outline"
                    >
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setSlideIndex((i) => Math.min(i + 1, getSlides().length - 1))}
                      isDisabled={slideIndex >= getSlides().length - 1}
                      colorScheme="cyan"
                    >
                      Siguiente
                    </Button>
                  </HStack>
                </Box>
              )}
            </GridItem>
          </Grid>
        </VStack>
      </Container>
    </Box>
  );
}

export default App;
