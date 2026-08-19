import { BRAZILIAN_STATES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";

export function LocationFields({
  cityId = "city",
  stateId = "state",
  zipId = "zipCode",
  required = false,
  defaultCity = "",
  defaultState = "",
  defaultZip = "",
  showZip = false,
}: {
  cityId?: string;
  stateId?: string;
  zipId?: string;
  required?: boolean;
  defaultCity?: string;
  defaultState?: string;
  defaultZip?: string;
  showZip?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor={cityId}>Cidade{required ? "" : " (opcional)"}</Label>
        <Input
          id={cityId}
          name={cityId}
          placeholder="Ex.: São Paulo"
          required={required}
          defaultValue={defaultCity}
        />
      </div>
      <div>
        <Label htmlFor={stateId}>Estado (UF){required ? "" : " (opcional)"}</Label>
        <Select id={stateId} name={stateId} defaultValue={defaultState} required={required}>
          <option value="">{required ? "Selecione..." : " - "}</option>
          {BRAZILIAN_STATES.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </Select>
      </div>
      {showZip && (
        <div className="sm:col-span-2">
          <Label htmlFor={zipId}>CEP (opcional)</Label>
          <Input
            id={zipId}
            name={zipId}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            defaultValue={defaultZip}
          />
        </div>
      )}
    </div>
  );
}
