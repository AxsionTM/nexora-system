import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container-wide">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-surface px-6 py-14 text-center sm:px-12"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-0"
          >
            <div className="absolute left-1/2 top-0 h-64 w-[500px] -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to run your business smarter?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Create a workspace in minutes, or explore the demo to see NEXORA
              with realistic data.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register">
                <Button size="lg">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="secondary" size="lg">
                  Explore demo
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
