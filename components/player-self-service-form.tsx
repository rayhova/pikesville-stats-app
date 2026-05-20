"use client";

import { useActionState, useState } from "react";
import { updatePlayerSelfServiceAction, type PlayerSelfServiceState } from "@/app/stats/players/actions";
import type { PlayerParentContactRecord } from "@/lib/admin-domain";

const initialState: PlayerSelfServiceState = {};

interface ContactDraft {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

function createContactDraft(contact?: PlayerParentContactRecord): ContactDraft {
  return {
    id: contact?.id ?? crypto.randomUUID(),
    fullName: contact?.fullName ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
  };
}

export function PlayerSelfServiceForm({
  playerId,
  rosterMembershipId,
  initialHeight,
  initialBirthdate,
  currentPhotoUrl,
  contacts,
}: Readonly<{
  playerId: string;
  rosterMembershipId: string;
  initialHeight: string;
  initialBirthdate?: string;
  currentPhotoUrl?: string;
  contacts: PlayerParentContactRecord[];
}>) {
  const [state, formAction, isPending] = useActionState(updatePlayerSelfServiceAction, initialState);
  const [contactRows, setContactRows] = useState<ContactDraft[]>(
    contacts.length > 0 ? contacts.map((contact) => createContactDraft(contact)) : [],
  );

  return (
    <form action={formAction} className="form-grid player-self-service-form">
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="rosterMembershipId" value={rosterMembershipId} />
      <div className="field-group">
        <label htmlFor="player-self-height">Height</label>
        <input id="player-self-height" name="height" defaultValue={initialHeight} required />
      </div>
      <div className="field-group">
        <label htmlFor="player-self-birthdate">Birthdate</label>
        <input id="player-self-birthdate" name="birthdate" type="date" defaultValue={initialBirthdate ?? ""} />
      </div>
      <div className="field-group">
        <label htmlFor="player-self-photo">Player Photo</label>
        {currentPhotoUrl ? (
          <div className="player-self-service-photo-preview">
            <img src={currentPhotoUrl} alt="Current player photo" />
          </div>
        ) : (
          <p className="meta">No player photo uploaded yet.</p>
        )}
        <input id="player-self-photo" name="photoFile" type="file" accept="image/*" />
        <p className="meta">Leave this empty to keep your current photo.</p>
      </div>
      <div className="field-group field-span-2">
        <label>Parent / Guardian Contacts</label>
        {contactRows.length > 0 ? (
          <div className="repeatable-stack">
            {contactRows.map((contact) => (
            <div key={contact.id} className="management-card">
              <div className="management-grid">
                <div className="field-group">
                  <label htmlFor={`parent-name-${contact.id}`}>Name</label>
                  <input
                    id={`parent-name-${contact.id}`}
                    name="parentFullName"
                    defaultValue={contact.fullName}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor={`parent-email-${contact.id}`}>Email</label>
                  <input
                    id={`parent-email-${contact.id}`}
                    name="parentEmail"
                    type="email"
                    defaultValue={contact.email}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor={`parent-phone-${contact.id}`}>Phone</label>
                  <input
                    id={`parent-phone-${contact.id}`}
                    name="parentPhone"
                    type="tel"
                    defaultValue={contact.phone}
                  />
                </div>
              </div>
              <div className="action-row">
                <button
                  className="button-link ghost"
                  type="button"
                  onClick={() => setContactRows((rows) => rows.filter((row) => row.id !== contact.id))}
                >
                  Remove Contact
                </button>
              </div>
            </div>
            ))}
          </div>
        ) : (
          <p className="meta">No parent or guardian contacts added yet.</p>
        )}
      </div>
      <div className="action-row field-span-2">
        <button
          className="button-link ghost"
          type="button"
          onClick={() => setContactRows((rows) => [...rows, createContactDraft()])}
        >
          Add Contact
        </button>
      </div>
      {state.error ? <p className="form-error field-span-2">{state.error}</p> : null}
      {state.success ? <p className="form-success field-span-2">Profile updated.</p> : null}
      <div className="action-row field-span-2">
        <button className="button-link" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Profile Details"}
        </button>
      </div>
    </form>
  );
}
