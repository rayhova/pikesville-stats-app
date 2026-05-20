"use client";

import { useActionState } from "react";
import { saveStaffProfileAction, type StaffProfileState } from "@/app/staff-profile/actions";

const initialState: StaffProfileState = {};

export function StaffProfileForm({
  profile,
  roleLabel,
  canEditRole,
}: Readonly<{
  profile: {
    displayName: string;
    fullName: string;
    staffRole?: string;
    bio?: string;
    photoUrl?: string;
  };
  roleLabel: string;
  canEditRole: boolean;
}>) {
  const [state, formAction, isPending] = useActionState(saveStaffProfileAction, initialState);

  return (
    <form action={formAction} className="form-grid player-coach-form">
      <input type="hidden" name="currentPhotoUrl" value={profile.photoUrl ?? ""} />
      <div className="field-group">
        <label htmlFor="staff-display-name">Display Name</label>
        <input id="staff-display-name" name="displayName" defaultValue={profile.displayName} required />
      </div>
      <div className="field-group">
        <label htmlFor="staff-full-name">Full Name</label>
        <input id="staff-full-name" name="fullName" defaultValue={profile.fullName} required />
      </div>
      <div className="field-group">
        <label htmlFor="staff-role">Staff Role</label>
        {canEditRole ? (
          <input id="staff-role" name="staffRole" defaultValue={profile.staffRole ?? ""} placeholder="Administrator" />
        ) : (
          <>
            <input id="staff-role" value={profile.staffRole ?? roleLabel} readOnly />
            <input type="hidden" name="staffRole" value={profile.staffRole ?? ""} />
          </>
        )}
      </div>
      <div className="field-group">
        <label htmlFor="staff-photo">Photo</label>
        <input id="staff-photo" name="photoFile" type="file" accept="image/*" />
      </div>
      {profile.photoUrl ? (
        <div className="field-group">
          <label>Current Photo</label>
          <img src={profile.photoUrl} alt={profile.displayName} className="staff-profile-photo-preview" />
        </div>
      ) : null}
      <div className="field-group field-span-2">
        <label htmlFor="staff-bio">Bio</label>
        <textarea
          id="staff-bio"
          name="bio"
          rows={6}
          defaultValue={profile.bio ?? ""}
          placeholder="Share a short background, coaching style, and what players should know about you."
        />
      </div>
      {state.error ? <p className="form-error field-span-2">{state.error}</p> : null}
      {state.success ? <p className="form-success field-span-2">Profile saved.</p> : null}
      <div className="action-row field-span-2">
        <button className="button-link" type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
