import { useState } from "react";
import { LuUser } from "react-icons/lu";
import { supabase } from "../../utils/supabase";
import "./profile.css";

function Profile({ user, profile, onProfileUpdated }) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const profileSnapshot = `${profile?.first_name ?? ""}\0${profile?.last_name ?? ""}\0${profile?.phone ?? ""}`;
  const [loadedProfileSnapshot, setLoadedProfileSnapshot] = useState(profileSnapshot);

  if (loadedProfileSnapshot !== profileSnapshot) {
    setLoadedProfileSnapshot(profileSnapshot);
    setFirstName(profile?.first_name ?? "");
    setLastName(profile?.last_name ?? "");
    setPhone(profile?.phone ?? "");
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveError("");
    setSaveSuccess("");
    setIsSaving(true);

    const updates = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      setSaveError(error.message);
      setIsSaving(false);
      return;
    }

    onProfileUpdated?.(data);
    setSaveSuccess("Profile saved.");
    setIsSaving(false);
  };

  const displayName =
    `${profile?.first_name ?? firstName} ${profile?.last_name ?? lastName}`.trim() ||
    "Your profile";

  return (
    <div className="container profile">
      <h2 className="bold-700">My Account</h2>
      <p>Hello, {displayName}!</p>

      <div className="details-container grid-col-2">
        <div className="left-container">
          <div className="card profile-summary">
            <div className="svg-wrapper">
              <LuUser />
            </div>
            <p className="bold-600">{displayName}</p>
            <p>{user.email}</p>
          </div>
        </div>

        <div className="right-container">
          <form className="card profile-form" onSubmit={handleSubmit}>
            <fieldset className="w-100">
              <label htmlFor="profileFirstName">First Name</label>
              <input
                id="profileFirstName"
                className="w-100 mt-05"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </fieldset>

            <fieldset className="w-100">
              <label htmlFor="profileLastName">Last Name</label>
              <input
                id="profileLastName"
                className="w-100 mt-05"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </fieldset>

            <fieldset className="w-100">
              <label htmlFor="profilePhone">Phone</label>
              <input
                id="profilePhone"
                className="w-100 mt-05"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </fieldset>

            {saveError && <p className="text-error profile-error">{saveError}</p>}
            {saveSuccess && <p className="text-success profile-error">{saveSuccess}</p>}

            <button className="primary w-100" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
