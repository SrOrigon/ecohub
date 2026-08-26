import { BRAZILIAN_STATES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-fields";

export function StreetAddressFields({
  idPrefix = "",
  streetId = "street",
  streetNumberId = "streetNumber",
  addressComplementId = "addressComplement",
  required = false,
  defaultStreet = "",
  defaultStreetNumber = "",
  defaultComplement = "",
}: {
  idPrefix?: string;
  streetId?: string;
  streetNumberId?: string;
  addressComplementId?: string;
  required?: boolean;
  defaultStreet?: string;
  defaultStreetNumber?: string;
  defaultComplement?: string;
}) {
  const prefix = idPrefix ? `${idPrefix}-` : "";
  const streetFieldId = `${prefix}${streetId}`;
  const numberFieldId = `${prefix}${streetNumberId}`;
  const complementFieldId = `${prefix}${addressComplementId}`;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={streetFieldId}>
          Rua / avenida{required ? "" : " (opcional)"}
        </Label>
        <Input
          id={streetFieldId}
          name={streetId}
          autoComplete="street-address"
          placeholder="Ex.: Rua das Flores"
          required={required}
          defaultValue={defaultStreet}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={numberFieldId}>Número{required ? "" : " (opcional)"}</Label>
          <Input
            id={numberFieldId}
            name={streetNumberId}
            placeholder="Ex.: 123"
            required={required}
            defaultValue={defaultStreetNumber}
          />
        </div>
        <div>
          <Label htmlFor={complementFieldId}>Complemento (opcional)</Label>
          <Input
            id={complementFieldId}
            name={addressComplementId}
            placeholder="Apto, bloco, casa..."
            defaultValue={defaultComplement}
          />
        </div>
      </div>
    </div>
  );
}

export function LocationFields({
  cityId = "city",
  stateId = "state",
  zipId = "zipCode",
  required = false,
  defaultCity = "",
  defaultState = "",
  defaultZip = "",
  showZip = false,
  showStreetAddress = false,
  defaultStreet = "",
  defaultStreetNumber = "",
  defaultComplement = "",
  idPrefix = "",
}: {
  cityId?: string;
  stateId?: string;
  zipId?: string;
  required?: boolean;
  defaultCity?: string;
  defaultState?: string;
  defaultZip?: string;
  showZip?: boolean;
  showStreetAddress?: boolean;
  defaultStreet?: string;
  defaultStreetNumber?: string;
  defaultComplement?: string;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-3">
      {showStreetAddress && (
        <StreetAddressFields
          idPrefix={idPrefix}
          required={required}
          defaultStreet={defaultStreet}
          defaultStreetNumber={defaultStreetNumber}
          defaultComplement={defaultComplement}
        />
      )}
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
    </div>
  );
}
