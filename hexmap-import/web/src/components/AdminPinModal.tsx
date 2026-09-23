import { useState } from "react";

interface AdminPinModalProps {
  onVerify: (pin: string) => Promise<boolean>;
  onClose: () => void;
}

export function AdminPinModal({ onVerify, onClose }: AdminPinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async () => {
    if (verifying) return;
    setVerifying(true);
    const ok = await onVerify(pin);
    setVerifying(false);
    if (!ok) {
      setError(true);
      setPin("");
    }
  };

  return (
    <div
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e1e36",
          borderRadius: 12,
          padding: 24,
          width: 300,
          border: "1px solid #2e2e4a",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            color: "#e8e8f0",
            fontSize: 18,
          }}
        >
          Admin Access
        </h3>
        <input
          type="password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Enter PIN"
          autoFocus
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: `1px solid ${error ? "#ef4444" : "#3e3e5a"}`,
            background: "#12121f",
            color: "#e8e8f0",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {error && (
          <p style={{ color: "#ef4444", fontSize: 12, margin: "8px 0 0" }}>
            Incorrect PIN
          </p>
        )}
        <div
          style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}
        >
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#9ca3af",
              border: "1px solid #3e3e5a",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={verifying || !pin}
            style={{
              background: verifying ? "#3730a3" : "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: verifying || !pin ? "not-allowed" : "pointer",
              opacity: verifying || !pin ? 0.7 : 1,
            }}
          >
            {verifying ? "Checking..." : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
