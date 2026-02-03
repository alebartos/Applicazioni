import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface TableSelectorProps {
  onTableSelect: (tableNumber: number) => void;
}

export function TableSelector({ onTableSelect }: TableSelectorProps) {
  const tables = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Messaggeria Digitale
          </CardTitle>
          <CardDescription className="text-lg">
            Seleziona il tuo tavolo per iniziare a inviare e ricevere messaggi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {tables.map((tableNumber) => (
              <Button
                key={tableNumber}
                variant="outline"
                className="h-16 text-lg hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white transition-all duration-300"
                onClick={() => onTableSelect(tableNumber)}
              >
                Tavolo {tableNumber}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}