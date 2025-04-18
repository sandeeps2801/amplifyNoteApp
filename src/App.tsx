"use client"
import {
  Authenticator,
  Button,
  Divider,
  Flex,
  Grid,
  Heading,
  Image,
  Text,
  TextField,
  View,
} from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getUrl, uploadData } from "aws-amplify/storage";
import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
import "./App.css";
import { Note } from './types';

Amplify.configure(outputs);
const client = generateClient<Schema>({
  authMode: "userPool",
});

const App = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState<[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const { data } = await client.models.Note.list();
      const notesList = await Promise.all(
        data.map(async (note: Record<string, unknown>) => {

          if (note.image) {
            const linkToStorageFile = await getUrl({
              path: ({ identityId }) => `media/${identityId}/${note.image}`,
            });
            note.image = linkToStorageFile.url;
          }
          return note;
        })
      );
      console.log(notesList);
      setNotes(notesList as []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }, [client]);

  const createNote = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const title = (form.get("title") as string | null) ?? "";
    const description = (form.get("description") as string | null) ?? "";
    const imageFile = form.get("image") as File;

    try {
      const { data: newNote } = await client.models.Note.create({
        title,
        description,
        image: imageFile?.name ?? "",
      });

      if (newNote?.image && imageFile) {
        await uploadData({
          path: ({ identityId }) => `media/${identityId}/${newNote.image}`,
          data: imageFile,
        }).result;
      }

      await fetchNotes();
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      formElement.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setLoading(false);
    }
  }, [fetchNotes]);

  const deleteNote = useCallback(async (id: string) => {
    try {
      await client.models.Note.delete({ id });
      await fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  }, [fetchNotes]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return (
    <Authenticator>
      {({ signOut }) => (
        <Flex
          className="App"
          direction="column"
          alignItems="center"
          padding="3rem 1rem"
          maxWidth="900px"
          margin="0 auto"
        >
          <Heading level={1} marginBottom="2rem">
            📝 Notes App
          </Heading>

          {/* Form Section */}
          <View
            as="form"
            onSubmit={createNote}
            backgroundColor="white"
            boxShadow="0 4px 12px rgba(0,0,0,0.05)"
            borderRadius="1rem"
            padding="2rem"
            width="100%"
            marginBottom="3rem"
          >
            <Flex direction="column" gap="1.5rem">
              <TextField
                name="title"
                placeholder="Title"
                label="Note Title"
                labelHidden
                variation="quiet"
                required
              />
              <TextField
                name="description"
                placeholder="Description"
                label="Note Description"
                labelHidden
                variation="quiet"
                required
              />
              <View
                name="image"
                as="input"
                type="file"
                accept="image/png, image/jpeg"
                alignSelf="flex-start"
              />
              <Button isLoading={loading} type="submit" variation="primary" size="large">
                ➕ Add Note
              </Button>
            </Flex>
          </View>

          <Divider marginBottom="3rem" />

          {/* Notes Section */}
          <Heading level={2} marginBottom="2rem">
            Your Notes
          </Heading>
          {notes.length < 1 ?
            <Heading>
              No notes avaliable
            </Heading>
            :
            (
              <Grid
                templateColumns="repeat(auto-fill, minmax(280px, 1fr))"
                gap="2rem"
                width="100%"
                justifyContent="center"
              >

                {(notes).map((note: Note) => (
                  <Flex
                    key={note.id || note.title}
                    direction="column"
                    padding="1.5rem"
                    backgroundColor="white"
                    boxShadow="0 4px 12px rgba(0,0,0,0.1)"
                    borderRadius="1rem"
                    alignItems="center"
                    textAlign="center"
                    className="note-card"
                  >
                    <Heading level={3} fontSize="1.5rem" marginBottom="0.5rem">
                      {note.title}
                    </Heading>
                    <Text fontStyle="italic" color="gray.700" marginBottom="1rem">
                      {note.description}
                    </Text>
                    {note.image && (
                      <Image
                        src={note.image}
                        alt={`visual aid for ${note.title}`}
                        style={{
                          width: '100%',
                          maxWidth: '250px',
                          borderRadius: '0.5rem',
                          marginBottom: '1rem',
                        }}
                      />
                    )}
                    <Button
                      variation="destructive"
                      size="small"
                      onClick={() => deleteNote(note.id)}
                    >
                      🗑️ Delete
                    </Button>
                  </Flex>
                ))}
              </Grid>
            )}
          <Button
            marginTop="3rem"
            onClick={signOut}
            variation="link"
            color="gray.600"
          >
            🔓 Sign Out
          </Button>
        </Flex>
      )}
    </Authenticator>
  );
}
export default App;