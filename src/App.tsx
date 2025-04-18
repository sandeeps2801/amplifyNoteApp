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
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import outputs from "../amplify_outputs.json";
import "./App.css";
import { Note } from './types';
import React from "react";

Amplify.configure(outputs);
const client = generateClient<Schema>({
  authMode: "userPool",
});

function App() {
  const [notes, setNotes] = useState<[]>([]);

  const fetchNotes = useCallback(async () => {
    try {
      const { data } = await client.models.Note.list();
      const notesList = await Promise.all(
        data.map(async (note: Record<string, unknown>) => {

          if (note.image) {
            const linkToStorageFile = await getUrl({
              path: ({ identityId }) => `media/${identityId}/${note.image}`,
            });
            console.log(linkToStorageFile.url);
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
  }, []);

  const createNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form: FormData = new FormData(event.currentTarget);
    console.log('form =>', form);
    const { data: newNote } = await client.models.Note.create({
      name: form.get("name") as string | null ?? "",
      description: form.get("description") as string | null ?? "",
      image: (form.get("image") as File).name,
    })
    console.log(' new note', newNote);
    if (newNote?.image)
      await uploadData({
        path: ({ identityId }) => `media/${identityId}/${newNote.image}`,
        data: form.get("image") as File,
      }).result;

    fetchNotes();
    event.currentTarget.reset();

  }

  const deleteNote = async (id: string) => {
    try {
      await client.models.Note.delete({ id });
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return <Authenticator>
    {({ signOut }) => (
      <Flex
        className="App"
        justifyContent="center"
        alignItems="center"
        direction="column"
        width="70%"
        margin="0 auto"
      >
        <Heading level={1}>Notes App</Heading>
        <View as="form" margin="3rem 0" onSubmit={createNote}>
          <Flex
            direction="column"
            justifyContent="center"
            gap="2rem"
            padding="2rem"
          >
            <TextField
              name="name"
              placeholder="Note Name"
              label="Note Name"
              labelHidden
              variation="quiet"
              required
            />
            <TextField
              name="description"
              placeholder="Note Description"
              label="Note Description"
              labelHidden
              variation="quiet"
              required
            />
            <View
              name="image"
              as="input"
              type="file"
              alignSelf={"end"}
              accept="image/png, image/jpeg"
            />

            <Button type="submit" variation="primary">
              Add Note
            </Button>
          </Flex>
        </View>
        <Divider />
        <Heading level={2}>Current Notes</Heading>
        <Grid
          margin="3rem 0"
          autoFlow="column"
          justifyContent="center"
          gap="2rem"
          alignContent="center"
        >
          {notes.map((note: Note) => (
            <Flex
              key={note.id || note.name}
              direction="column"
              justifyContent="center"
              alignItems="center"
              gap="2rem"
              border="1px solid #ccc"
              padding="2rem"
              borderRadius="5%"
              className="box"
            >
              <View>
                <Heading level={3}>{note.name}</Heading>
              </View>
              <Text fontStyle="italic">{note.description}</Text>
              {note.image && (
                <Image
                  src={note.image}
                  alt={`visual aid for `}
                  style={{ width: 400 }}
                />
              )}
              <Button
                variation="destructive"
                onClick={() => deleteNote(note.id)}
              >
                Delete note
              </Button>
            </Flex>
          ))}
        </Grid>
        <Button onClick={signOut}>Sign Out</Button>
      </Flex>
    )}
  </Authenticator>;
}

export default App;