import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { usePlayerSearch, type Player } from "@/api/players";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PlayerSearchInputProps {
  onPlayerSelect: (player: Player) => void;
  onCancel?: () => void;
  excludePlayerIds?: number[];
  placeholder?: string;
  autoFocus?: boolean;
}

export function PlayerSearchInput({
  onPlayerSelect,
  onCancel,
  excludePlayerIds = [],
  placeholder = "Search players...",
  autoFocus = true,
}: PlayerSearchInputProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Search API call
  const { data: searchResults, isLoading } = usePlayerSearch(debouncedQuery);

  // Filter out already linked players
  const filteredResults =
    searchResults?.filter(
      (player) => !excludePlayerIds.includes(player.id)
    ) || [];

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length]);

  // Open dropdown when we have results
  useEffect(() => {
    if (debouncedQuery.length >= 2 && filteredResults.length > 0) {
      setIsOpen(true);
    } else if (debouncedQuery.length < 2) {
      setIsOpen(false);
    }
  }, [debouncedQuery, filteredResults.length]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredResults.length === 0) {
      if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        onCancel();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredResults.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        if (onCancel) onCancel();
        break;
    }
  };

  const handleSelect = (player: Player) => {
    onPlayerSelect(player);
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
  };

  const formatHandicap = (handicap: number | null | undefined): string => {
    if (handicap === null || handicap === undefined) return "-";
    return handicap >= 0 ? `+${handicap.toFixed(1)}` : handicap.toFixed(1);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal/40" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (debouncedQuery.length >= 2 && filteredResults.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="pl-9 pr-8 rounded border-soft-grey focus:border-turf focus:ring-turf/20"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-soft-grey/30 rounded transition-colors"
          >
            <X className="h-3.5 w-3.5 text-charcoal/40" />
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && debouncedQuery.length >= 2 && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-turf" />
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && filteredResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded border border-soft-grey shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto divide-y divide-soft-grey">
            {filteredResults.map((player, index) => (
              <button
                key={player.id}
                type="button"
                onClick={() => handleSelect(player)}
                className={cn(
                  "w-full px-4 py-3 text-left flex items-center justify-between transition-colors",
                  index === selectedIndex
                    ? "bg-turf/10"
                    : "hover:bg-turf/5"
                )}
              >
                <span className="font-medium text-charcoal">{player.name}</span>
                <span className="text-sm text-charcoal/70">
                  HCP {formatHandicap(player.handicap)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {isOpen &&
        debouncedQuery.length >= 2 &&
        !isLoading &&
        filteredResults.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded border border-soft-grey shadow-lg p-4 text-center text-charcoal/70 text-sm">
            No players found matching "{debouncedQuery}"
          </div>
        )}

      {/* Hint Text */}
      {query.length > 0 && query.length < 2 && (
        <p className="mt-1 text-xs text-charcoal/50">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
}
