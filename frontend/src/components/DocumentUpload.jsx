// src/components/DocumentUpload.jsx
import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Input,
  Text,
  useToast,
  VStack,
  Icon,
  Flex,
  Spinner,
} from '@chakra-ui/react';
import { FiUploadCloud, FiFile } from 'react-icons/fi';

function DocumentUpload({ onUploadSuccess, onError }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      toast({
        title: 'Archivo inválido',
        description: 'Solo se permiten archivos PDF.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'Por favor selecciona un documento.',
        description: 'Debes subir un archivo PDF para analizarlo.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    setIsUploading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/upload-and-process/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        onUploadSuccess(data.filename, data.keywords, data.related_questions);
        setSelectedFile(null);
      } else {
        onError(data.detail || 'Error al procesar el documento.');
      }
    } catch (err) {
      onError('Error de red al subir el documento.');
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <Box
      p={4}
      bg="gray.800"
      borderRadius="md"
      border="2px dashed"
      borderColor="cyan.500"
      textAlign="center"
      transition="all 0.3s"
      _hover={{ borderColor: "cyan.300", bg: "gray.700" }}
    >
      <VStack spacing={3}>
        <Icon as={FiUploadCloud} boxSize={8} color="cyan.300" />
        <Text fontSize="sm" color="gray.300">
          Arrastra tu documento PDF aquí o usa el botón para seleccionarlo
        </Text>

        <Input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          hidden
          ref={fileInputRef}
        />

        <Button
          colorScheme="cyan"
          variant="outline"
          onClick={() => fileInputRef.current.click()}
        >
          Seleccionar archivo
        </Button>

        {selectedFile && (
          <Flex align="center" gap={2} mt={2}>
            <Icon as={FiFile} color="green.300" />
            <Text fontSize="sm" color="green.300" isTruncated maxW="250px">
              {selectedFile.name}
            </Text>
          </Flex>
        )}

        <Button
          colorScheme="green"
          onClick={handleUpload}
          isDisabled={isUploading}
        >
          {isUploading ? <Spinner size="sm" /> : 'Subir'}
        </Button>
      </VStack>
    </Box>
  );
}

export default DocumentUpload;
