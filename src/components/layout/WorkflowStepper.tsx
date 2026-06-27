import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { workflowSteps } from "../../lib/workflow";
import { useAppStore } from "../../stores/appStore";

export function WorkflowStepper() {
  const { t } = useTranslation();
  const workflowStep = useAppStore((state) => state.workflowStep);
  const currentIndex = workflowSteps.findIndex((step) => step.id === workflowStep);

  return (
    <section className="workflow-stepper" aria-label={t("workflow.label")}>
      {workflowSteps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div
            className={[
              "workflow-step",
              isCompleted ? "workflow-step--completed" : "",
              isCurrent ? "workflow-step--current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={step.id}
          >
            <span className="workflow-step__marker">
              {isCompleted ? <Check size={13} aria-hidden="true" /> : index + 1}
            </span>
            <span>{t(step.labelKey)}</span>
          </div>
        );
      })}
    </section>
  );
}
