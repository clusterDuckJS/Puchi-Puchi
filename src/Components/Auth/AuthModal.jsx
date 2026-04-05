import React from 'react'
import './auth.css'
import { createPortal } from 'react-dom';
import { LuCross, LuX } from 'react-icons/lu';
function AuthModal({ isOpen, onClose, children }) {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="close-btn-container right">
                    <LuX className="close-icon pointer" onClick={onClose} />
                </div>
                {children}
            </div>
        </div>,
        document.getElementById("modal-root")
    );
}

export default AuthModal