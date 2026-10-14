import { TextArea } from '~/components/FormFields';
import type { AutoResponseTemplates } from '~/types/autoResponse';
import { autoResponseDefinitions } from '~/utils/autoResponses';

type AutoResponseTemplateFieldsProps = {
  templates: AutoResponseTemplates | null;
};

export const AutoResponseTemplateFields = ({
  templates,
}: AutoResponseTemplateFieldsProps) => (
  <fieldset className='space-y-5 border-t border-black/10 pt-5'>
    <legend className='px-1 text-sm font-semibold text-slate-900'>
      Automatic responses
    </legend>
    <p className='text-xs leading-5 text-black/55'>
      Customize each message or leave it blank to use the default shown below.
      Available placeholders: {'{{customerName}}'}, {'{{reference}}'},{' '}
      {'{{organizationName}}'}, {'{{receivedDate}}'}. Received date uses
      YYYY-MM-DD (UTC) for the original email.
    </p>
    {autoResponseDefinitions.map(
      ({ field, label, description, defaultValue }) => (
        <div key={field}>
          <TextArea
            id={field}
            name={field}
            label={label}
            defaultValue={templates?.[field] ?? ''}
            placeholder={defaultValue}
            maxLength={10_000}
            aria-describedby={`${field}-help`}
            className='[&_textarea]:h-44 [&_textarea]:min-h-44 [&_textarea]:resize-y [&_textarea]:p-4 [&_textarea]:font-sans'
          />
          <p id={`${field}-help`} className='mt-2 text-xs text-black/45'>
            {description}
          </p>
        </div>
      ),
    )}
  </fieldset>
);
