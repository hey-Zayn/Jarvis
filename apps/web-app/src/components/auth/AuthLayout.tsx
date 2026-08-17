import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md glass-elevated animate-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-text-primary">{title}</CardTitle>
          {description && (
            <CardDescription className="text-text-secondary mt-2">{description}</CardDescription>
          )}
        </CardHeader>
        <Separator className="mx-6 my-2 border-border" />
        <CardContent className="pt-4">{children}</CardContent>
        {footer && (
          <CardFooter className="flex justify-center pt-4 pb-6 border-t border-border">
            {footer}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}