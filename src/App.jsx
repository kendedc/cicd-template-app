import React, { useState, useMemo } from 'react';

// Azure Pipeline Customizer — parameters edition
// Left: controls for pipeline configuration + editable list of parameters (name, type, default)
// Right: read-only generated azure-pipelines.yml (copyable)
// Tailwind classes used for styling; replace or add CSS if you don't use Tailwind.

export default function AzurePipelineCustomizerWithParameters() {
  // Default state values
  const PROJECT_NAME = 'project-name';
  const TRIGGER_BRANCHES = 'main,development,staging';
  const VM_IMAGE = 'ubuntu-latest';
  const PARAMETERS = [
    {
      id: 0,
      name: 'nodeVersion',
      type: 'string',
      default: '20.x',
      isFixedName: true,
    },
  ];

  const [projectName, setProjectName] = useState(PROJECT_NAME);
  const [triggerBranches, setTriggerBranches] = useState(TRIGGER_BRANCHES);
  const [vmImage, setVmImage] = useState(VM_IMAGE);
  const [parameters, setParameters] = useState(PARAMETERS);

  const [copyStatus, setCopyStatus] = useState('');

  // parameters: array of { id, name, type, default }

  const addParameter = () => {
    const nextId = parameters.length
      ? Math.max(...parameters.map((p) => p.id)) + 1
      : 1;
    setParameters([
      ...parameters,
      { id: nextId, name: `param${nextId}`, type: 'string', default: '' },
    ]);
  };

  const updateParameter = (id, field, value) => {
    setParameters(
      parameters.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removeParameter = (id) => {
    setParameters(parameters.filter((p) => p.id !== id));
  };

  const generatedYaml = useMemo(() => {
    // build parameters YAML block
    const paramsBlock = parameters.length
      ? `parameters:\n${parameters
          .map((p) => {
            const defVal =
              p.type === 'string'
                ? `"${escapeYaml(String(p.default))}"`
                : `${String(p.default)}`;
            return `- name: ${p.name}\n  type: ${p.type}\n  default: ${defVal}`;
          })
          .join('\n')}`
      : '';

    const triggers = triggerBranches
      .split(/\s*,\s*/)
      .map((b) => b.trim())
      .filter(Boolean);
    const triggerSection = triggers.length
      ? `trigger:\n  branches:\n    include:\n${triggers.map((t) => `      - ${t}`).join('\n')}`
      : '';

    const resourcesSection =
      'resources:\n  repositories:\n    - repository: cicd-templates\n      type: github\n      name: kendedc/test-cicd-template\n      ref: refs/heads/main\n      endpoint: kendedc';

    const variableGroupSection = `variables:\n- group: ${projectName}-variable-group`;

    const stages = [];

    stages.push(
      "- stage: Build\n  displayName: \"Build Stage\"\n  jobs:\n  - job: InstallNode\n    displayName: \"Install Node Job\"\n    steps:\n    - template: install-node.yml@cicd-templates\n      parameters:\n        nodeVersion: ${{ parameters.nodeVersion }}\n  - job: Build\n    displayName: \"Build Job\"\n    dependsOn: InstallNode\n    steps:\n    - template: ci-steps.yml@cicd-templates\n\n- stage: Deploy\n  displayName: \"Deploy Stage\"\n  dependsOn: Build\n  condition: and(succeeded(), ne(variables['Build.Reason'], 'PullRequest'))\n  jobs:\n  - job: Deploy\n    displayName: \"Deploy Job\"\n    steps:\n    - template: cd-steps.yml@cicd-templates"
    );

    const stagesYaml = stages.length
      ? `stages:\n${stages.join('\n')}`
      : "steps:\n- script: echo 'No build steps selected'\n  displayName: 'No-op'";

    const yamlParts = [
      `name: ${projectName}`,
      triggerSection,
      resourcesSection,
      variableGroupSection,
      paramsBlock,
      `pool:\n  vmImage: ${vmImage}`,
      '',
      stagesYaml,
    ]
      .filter(Boolean)
      .join('\n\n');

    return yamlParts;
  }, [
    projectName,
    triggerBranches,
    vmImage,
    parameters,
  ]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedYaml);
      setCopyStatus('Copied!');
    } catch (e) {
      console.log('Copy failed', e);
      setCopyStatus('Copy failed');
    }
    setTimeout(() => setCopyStatus(''), 1500);
  };

  return (
    <div className="min-h-[60vh] p-4">
      <h2 className="text-xl font-semibold mb-4">
        Azure Pipelines customizer (parameters)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left controls */}
        <div className="md:col-span-1 bg-white border rounded-lg p-4 shadow-sm">
          <div className="space-y-4">
            <label className="block">
              <div className="text-sm text-gray-600">Project name</div>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="mt-1 block w-full border rounded px-2 py-1"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">
                Trigger branches (comma separated)
              </div>
              <input
                value={triggerBranches}
                onChange={(e) => setTriggerBranches(e.target.value)}
                className="mt-1 block w-full border rounded px-2 py-1"
              />
            </label>

            <label className="block">
              <div className="text-sm text-gray-600">Agent VM image</div>
              <select
                value={vmImage}
                onChange={(e) => setVmImage(e.target.value)}
                className="mt-1 block w-full border rounded px-2 py-1"
              >
                <option>ubuntu-latest</option>
                <option>windows-latest</option>
                <option>macos-latest</option>
              </select>
            </label>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Parameters</div>
                <button
                  onClick={addParameter}
                  className="px-2 py-1 text-sm rounded bg-gray-100 border"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {parameters.map((p) => (
                  <div key={p.id} className="border rounded p-2 bg-slate-50">
                    <div className="flex gap-2 items-center min-w-0">
                      <input
                        className="min-w-0 p-1 border rounded"
                        value={p.name}
                        disabled={p.isFixedName}
                        onChange={(e) =>
                          updateParameter(p.id, 'name', e.target.value)
                        }
                      />
                      <select
                        value={p.type}
                        disabled={p.isFixedName}
                        onChange={(e) =>
                          updateParameter(p.id, 'type', e.target.value)
                        }
                        className="p-1 border rounded flex-shrink-0"
                      >
                        <option value="string">string</option>
                        <option value="boolean">boolean</option>
                        <option value="number">number</option>
                      </select>
                      <input
                        className="flex-1 p-1 border rounded w-28 flex-shrink-0"
                        value={String(p.default)}
                        onChange={(e) => {
                          const val =
                            p.type === 'boolean'
                              ? e.target.value === 'true'
                              : p.type === 'number'
                                ? Number(e.target.value)
                                : e.target.value;
                          updateParameter(p.id, 'default', val);
                        }}
                      />
                      <button
                        onClick={() => removeParameter(p.id)}
                        className="px-2 py-1 text-sm rounded bg-red-100 border flex-shrink-0"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <button
                onClick={() => {
                  setProjectName(PROJECT_NAME);
                  setTriggerBranches(TRIGGER_BRANCHES);
                  setVmImage(VM_IMAGE);
                  setParameters(PARAMETERS);
                }}
                className="px-3 py-1 rounded bg-gray-100 border"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Right: generated azure-pipelines.yml */}
        <div className="md:col-span-2">
          <div className="bg-slate-900 text-slate-50 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
              <div className="text-sm">
                Generated <code>azure-pipelines.yml</code> (read-only)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1 bg-slate-700 rounded text-sm"
                >
                  Copy
                </button>
                {copyStatus && (
                  <span className="text-xs text-slate-300">{copyStatus}</span>
                )}
              </div>
            </div>
            <pre className="p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-[70vh] overflow-auto">
              {generatedYaml}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function escapeYaml(s) {
  return String(s).replace(/"/g, '\\"');
}
