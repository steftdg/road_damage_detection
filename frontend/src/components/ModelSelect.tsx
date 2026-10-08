import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Model } from "../types";
import { modelPresentation } from "../modelPresentation";

export default function ModelSelect({
  models,
  value,
  disabled,
  onChange,
}: {
  models: Model[];
  value: string;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [upward, setUpward] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = models.find((m) => m.id === value);
  const show = () => {
    setActive(
      Math.max(
        0,
        models.findIndex((m) => m.id === value),
      ),
    );
    const rect = trigger.current?.getBoundingClientRect();
    setUpward(!!rect && innerHeight - rect.bottom < 370 && rect.top > 340);
    setOpen(true);
  };
  const choose = (index: number) => {
    if (models[index]) onChange(models[index].id);
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);
  return (
    <div className="model-select" ref={root}>
      <label id={`${id}-label`}>Modèle de détection</label>
      <button
        ref={trigger}
        type="button"
        className="model-select-trigger"
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-controls={`${id}-list`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (
            ["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            if (!open) {
              show();
              return;
            }
            if (event.key === "Enter" || event.key === " ") choose(active);
            else if (event.key === "Home") setActive(0);
            else if (event.key === "End") setActive(models.length - 1);
            else
              setActive(
                (index) =>
                  (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    models.length) %
                  models.length,
              );
          } else if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          } else if (event.key === "Tab") setOpen(false);
        }}
      >
        <span>
          <strong>{modelPresentation(value).name}</strong>
          <small>
            {selected?.recommended ? "Recommandé" : "Version alternative"}
          </small>
        </span>
        <ChevronDown size={19} className={open ? "rotated" : ""} />
      </button>
      {open && (
        <div
          className={`model-options ${upward ? "opens-up" : ""}`}
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
        >
          {models.map((model, index) => (
            <div
              key={model.id}
              id={`${id}-${index}`}
              role="option"
              aria-selected={value === model.id}
              className={`model-option ${active === index ? "focused" : ""}`}
              onPointerMove={(event) => {
                if (event.movementX || event.movementY) setActive(index);
              }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>
                <strong>
                  {modelPresentation(model.id).name}
                  {model.recommended && <em>Recommandé</em>}
                </strong>
                <small>{modelPresentation(model.id).description}</small>
              </span>
              {value === model.id && <Check size={18} />}
            </div>
          ))}
        </div>
      )}
      <p className="model-description">
        {modelPresentation(value).description}
      </p>
    </div>
  );
}
