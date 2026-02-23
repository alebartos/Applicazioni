"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog@1.1.6";
import { XIcon } from "lucide-react@0.487.0";

import { cn } from "./utils";

function Dialog({
                  ...props
                }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
                         ...props
                       }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
                        ...props
                      }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
                       ...props
                     }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
                         className,
                         style,
                         ...props
                       }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
      <DialogPrimitive.Overlay
          data-slot="dialog-overlay"
          className={cn(
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50",
              className,
          )}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            ...style,
          }}
          {...props}
      />
  );
}

function DialogContent({
                         className,
                         children,
                         style,
                         ...props
                       }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
      <DialogPortal data-slot="dialog-portal">
        <DialogOverlay />
        {/* Wrapper scrollabile che centra il contenuto */}
        <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflowY: 'auto',
              padding: '1rem',
              pointerEvents: 'none',
            }}
        >
          <DialogPrimitive.Content
              data-slot="dialog-content"
              className={cn(
                  "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 grid w-full max-w-2xl gap-4 rounded-lg border shadow-lg duration-200",
                  className,
              )}
              style={{
                position: 'relative',
                padding: '1.5rem',
                maxWidth: 'calc(100% - 2rem)',
                maxHeight: '90vh',
                overflowY: 'auto',
                pointerEvents: 'auto',
                margin: 'auto',
                ...style,
              }}
              {...props}
          >
            {children}
            <DialogPrimitive.Close
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  opacity: 0.7,
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '0.25rem',
                }}
                className="transition-opacity hover:opacity-100 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0"
            >
              <XIcon style={{ width: '1rem', height: '1rem' }} />
              <span style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="dialog-header"
          className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
          {...props}
      />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
      <div
          data-slot="dialog-footer"
          className={cn(
              "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
              className,
          )}
          {...props}
      />
  );
}

function DialogTitle({
                       className,
                       ...props
                     }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
      <DialogPrimitive.Title
          data-slot="dialog-title"
          className={cn("text-lg leading-none font-semibold", className)}
          {...props}
      />
  );
}

function DialogDescription({
                             className,
                             ...props
                           }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
      <DialogPrimitive.Description
          data-slot="dialog-description"
          className={cn("text-muted-foreground text-sm", className)}
          {...props}
      />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
