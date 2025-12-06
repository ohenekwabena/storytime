"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { addCreditsAction } from "@/app/actions/credit-actions";

export function AddCreditsButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddCredits = async () => {
    setIsLoading(true);
    try {
      const result = await addCreditsAction(100);
      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        alert(`Success! Added 100 credits. New balance: ${result.newCredits}`);
        window.location.reload();
      }
    } catch (error) {
      alert("Failed to add credits");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleAddCredits} disabled={isLoading} variant="outline" size="sm" className="text-xs">
      {isLoading ? (
        <>
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Adding...
        </>
      ) : (
        <>
          <Plus className="w-3 h-3 mr-1" />
          Add 100 Credits
        </>
      )}
    </Button>
  );
}
